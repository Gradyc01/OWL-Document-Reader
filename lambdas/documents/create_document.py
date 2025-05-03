import json
import uuid
# Internal module - licensed under the project's license.
from db_util import execute_statement

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

def lambda_handler(event, context):
    """
    Handles the lambda for adding a document

    Input:
        event: 
            filename = The document original file's name
            bucket = the document files bucket
            user_id = The user's user_id
            doc_type = What type of document this is
            category = What category of document this is (Passport, drivers license) (optional)
            device = what device was used (optional)
            ip = where did this come from (optional)
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

    original_filename = body.get('original_filename')
    bucket = body.get('bucket')
    user_id = body.get('user_id')
    doc_type = body.get('doc_type')
    device = body.get('device')
    category = body.get('category')
    ip = body.get('ip')
    
    if not bucket or not user_id or not doc_type:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps("Missing required input values")
        }
    
    filename: str = user_id + "_" + doc_type + "_" + str(uuid.uuid4())

    columns: str = "filename, original_filename, bucket, user_id, doc_type, upload_date"
    values: str = ":filename, :original_filename, :bucket, :user_id, :doc_type, NOW()"
    params: dict = {
        'filename': filename, 
        'original_filename': original_filename, 
        'bucket': bucket,
        'user_id': user_id, 
        'doc_type': doc_type
    }
    
    # if capture_date is not None:
    #     variables += ", capture_date"
    #     values += ", CAST('" + capture_date + "' AS TIMESTAMP WITHOUT TIME ZONE)"
    #     dict['capture_date'] = capture_date

    if category is not None:
        columns += ", category"
        values += ", :category"
        params['category'] = category

    if device is not None:
        columns += ", device"
        values += ", :device"
        params['device'] = device

    if ip is not None:
        columns += ", ip"
        values += ", :ip"
        params['ip'] = ip

    sql = "INSERT INTO documents (" + columns + ") VALUES (" + values + ");"
    response = execute_statement(sql, params)

    if response.get("ResponseMetadata").get("HTTPStatusCode") != 200:
        return { 
            "statusCode": response.get("ResponseMetadata").get("HTTPStatusCode"),
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Failed to create document", "data": { "dbResponse": response }})
        }

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({"message": "Documents creation successful", "data": { "dbResponse": response, "filename": filename }})
    }
