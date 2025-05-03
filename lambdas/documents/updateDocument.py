import json
from db_util import execute

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
}

def lambda_handler(event, context):
    """
    Handles the lambda for adding a document

    Input:
        event: 
            filename = The document file's name
            bucket = the document files bucket
            new_filename = The new original filename
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

    filename_identifier = body.get('filename')
    bucket = body.get('bucket')
    new_filename = body.get('new_filename')
    
    if not bucket or not filename_identifier or not new_filename:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps("Missing required input values")
        }

    sql = "UPDATE documents SET original_filename = '" + new_filename + "'"
    sql += " WHERE filename = '" + filename_identifier + "' AND bucket = '" + bucket + "';"
    response = execute(sql)

    statusCode = None
    try:
        statusCode = response.get("ResponseMetadata").get("HTTPStatusCode")
    except Exception as e:
        statusCode = response.get('statusCode')

    if statusCode!= 200:
        return { 
            "statusCode": statusCode,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Failed to update document", "data": response })
        }

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({"message": "Documents update successful", "data": 
                            { "data": response, "file": filename_identifier, "new_name": new_filename}})
    }
