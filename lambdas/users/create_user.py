# Now Combined with register
# import json
# import uuid
# from db_util import execute_statement

# CORS_HEADERS = {
#     "Access-Control-Allow-Origin": "*",
#     "Access-Control-Allow-Headers": "Content-Type,Authorization",
#     "Access-Control-Allow-Methods": "OPTIONS,POST"
# }

# def lambda_handler(event, context):
#     """
#     Handles the lambda for adding a user

#     Input:
#         event: 
#             firstname = the user's first name
#             lastname = the user's last name
#             email = the user's email
#             password = the user's password
#         context:
#             Not used

#     Output: 
#         returns the response from executing the statement with a json message
#     """

#     if event.get("httpMethod") == "OPTIONS":
#         return {
#             "statusCode": 200,
#             "headers": CORS_HEADERS,
#             "body": json.dumps({"message": "CORS preflight success"})
#         }
    
#     body = json.loads(event["body"])
    
#     user_id = str(uuid.uuid4())
#     email = body.get('email')
#     firstname = body.get('firstname')
#     lastname = body.get('lastname')
#     password = body.get('password')

#     if not user_id or not email or not password or not firstname or not lastname:
#         return {
#             "statusCode": 400,
#             "headers": CORS_HEADERS,
#             "body": json.dumps("Missing user_id, email, or password, firstname, lastname")
#         }

#     sql = "INSERT INTO users (user_id, email, password, firstname, lastname) VALUES (:user_id, :email, :password, :firstname, :lastname)"
#     response = execute_statement(sql, {
#         'user_id': user_id, 
#         'email': email, 
#         'password': password,
#         'firstname':firstname,
#         'lastname':lastname
#     })
    
#     return {
#         "statusCode": 200,
#         "headers": CORS_HEADERS,
#         "body": json.dumps({"message": "User creation successful", "data": response})
#     }
