import os
import json
import boto3
from db_util import execute_statement
from db_util import CORS_HEADERS
from botocore.exceptions import ClientError

COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID")

cognito_client = boto3.client("cognito-idp")

def lambda_handler(event, context):
        
    try:
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "CORS preflight success"})
            }

        body = json.loads(event["body"])

        if not body.get("email") or not body.get("password"):
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Missing email or password"})
            }

        response = cognito_client.admin_create_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=body["email"],
            TemporaryPassword=body["password"],
            MessageAction='SUPPRESS',
            UserAttributes=[
                {"Name": "email", "Value": body["email"]},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "given_name", "Value": body.get("firstName", "")},
                {"Name": "family_name", "Value": body.get("lastName", "")},
            ]
        )

        cognito_client.admin_set_user_password(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=body["email"],
            Password=body["password"],
            Permanent=True
        )

        user_id = response["User"]["Username"]

        rds_response = add_to_relational_database(user_id, body)
        if (rds_response["statusCode"] != 200):
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": rds_response})
            }

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "message": "Registration successful (auto-confirmed)",
                "data": response,
                "rds_data": rds_response
            }, default=str)
        }

    except ClientError as e:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"code": e.response["Error"]["Code"], "message": e.response["Error"]["Message"]})
        }
    except Exception as ex:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "message": "Internal Server Error", 
                "error": str(ex)
            })
        }
    
def add_to_relational_database(user_id: str, body: json) -> json:
        email = body["email"]
        # password = body["password"]
        firstname = body.get("firstName", "")
        lastname = body.get("lastName", "")
        
        if not user_id or not email or not firstname or not lastname:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps("Missing user_id, email, or password, firstname, lastname")
            }

        sql = "INSERT INTO users (user_id, email, firstname, lastname) VALUES (:user_id, :email, :firstname, :lastname)"
        response = execute_statement(sql, {
            'user_id': user_id, 
            'email': email, 
            # 'password': password,
            'firstname':firstname,
            'lastname':lastname
        })
        print(response)
        statusCode: int = 400
        try:
            statusCode = response["statusCode"]
        except:
            statusCode = response["ResponseMetadata"]["HTTPStatusCode"]
        return {
            "statusCode": statusCode,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "User creation successful", "data": response})
        }