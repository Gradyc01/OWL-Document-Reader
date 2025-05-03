import json
from db_util import execute_statement
from db_util import CORS_HEADERS
# boto3 and botocore are used for AWS integration.
# Licensed under the Apache License 2.0.
# See LICENSE.md for full details
import boto3

def lambda_handler(event, context):
    """
    Handles the lambda for deleting specific documents
    
    Input:
        event: 
            filenames = Array of document filenames to delete
            user_id = The user ID
        context:
            Not used
            
    Output: 
        returns the response from executing the statement with a json message
    """
    
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "CORS preflight success"})
        }
        
    body = json.loads(event["body"])
    
    # Get the array of filenames to delete
    filenames = body.get('filenames')
    user_id = body.get('user_id')
    
    if not filenames or not isinstance(filenames, list) or len(filenames) == 0:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps("Missing filenames array")
        }
    
    for filename in filenames:
        delete_from_s3(filename)
    
    deleted_count = 0
    for filename in filenames:
        sql = "DELETE FROM documents WHERE filename = :filename"
        if user_id:
            sql += " AND user_id = :user_id"
            response = execute_statement(sql, {'filename': filename, 'user_id': user_id})
        else:
            response = execute_statement(sql, {'filename': filename})
            
        if response.get("ResponseMetadata").get("HTTPStatusCode") == 200:
            deleted_count += 1
    
    if deleted_count != len(filenames):
        return {
            "statusCode": 207,  # Partial success
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "message": f"Partially deleted documents: {deleted_count}/{len(filenames)}",
                "data": {
                    "deletedCount": deleted_count,
                    "totalRequested": len(filenames)
                }
            })
        }
        
    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({
            "message": "Documents deletion successful",
            "data": {
                "deletedCount": deleted_count,
                "filenames": filenames
            }
        })
    }

def delete_from_s3(filename: str) -> None:
    s3_client = boto3.client('s3')
    
    buckets = [
        {'bucket_name': 'owl-forms', 'folders': ['forms', 'metadata']},
        {'bucket_name': 'owl-ids', 'folders': ['ids', 'metadata']}
    ]

    for bucket in buckets:
        bucket_name = bucket['bucket_name']
        
        for folder in bucket['folders']:
            prefix = folder + '/'  
            file = prefix + filename
            if (folder == 'metadata'):
                file += '.json'
            try:
                response = s3_client.delete_object(Bucket=bucket_name, Key=file)
                print(f"Deleted {file} from {bucket_name}: {response}")
            except Exception as e:
                print(f"Error deleting {file} from {bucket_name}: {str(e)}")
