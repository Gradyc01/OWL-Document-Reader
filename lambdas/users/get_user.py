import json
from db_util import execute_statement

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

def lambda_handler(event, context):
    """
    Handles the lambda for getting a specifc user with specific user_id/email or all users if no user_id or email is provided

    Input:
        event: 
            user_id = The User's user_id
            email = The User's email
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
    email = event.get('queryStringParameters').get('email')
    
    conditions: str = ""
    params: dict = {}

    if user_id is not None:
        conditions = addSQLCondition("user_id", conditions)
        params['user_id'] = user_id
    
    if email is not None:
        conditions = addSQLCondition("email", conditions)
        params['email'] = email


    sql:str = "SELECT * FROM users" + conditions + ";"
    response = execute_statement(sql, params)

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({"message": "Users retrieval successful", "data": response})
    }


def addSQLCondition(tag: str, string: str) -> str:
    new_string: str = ""

    if (len(string) > 0):
        new_string = string + " AND " + tag + " = :" + tag
    else:
        new_string = " WHERE " + tag + " = :" + tag

    return new_string