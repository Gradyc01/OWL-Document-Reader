import json
from db_util import execute_statement

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

def lambda_handler(event, context):
    """
    Handles the lambda retrieving documents by user id. If no user id is provided, all documents are retrieved.

    Input:
        event: 
            user_id = the user id for the documents to be retrieved
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

    user_id = event.get('queryStringParameters').get('user_id')

    if user_id == "ADMIN":
        sql = "SELECT documents.*, users.firstname, users.lastname, users.email FROM documents LEFT JOIN users ON documents.user_id = users.user_id"
        response = execute_statement(sql, {})
    else:
        sql = "SELECT * FROM documents WHERE user_id = :user_id"
        response = execute_statement(sql, {'user_id': user_id})

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({"message": "Documents retrieval successful", "data": response})
    }
