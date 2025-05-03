import boto3
import boto3.session
from db_util import CORS_HEADERS
from db_util import execute
from filestring import FILESTRING
import json
import requests

def lambda_handler(event, context):

    if (reset_rds() is False): 
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': "RDS was not able to reset properly"
        }

    if (delete_users() is False):
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': "There was an error when attempting to delete all users in Cognito"
        }
    
    if (add_test_users() is False):
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': "There was an error when attempting to create a test user"
        }
    
    if (reset_s3() is False):
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': "s3 was not able to reset properly"
        }
    
    if (add_test_documents() is False):
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': "User was not found"
        }

    return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': "Successfully reset the RDS and Cognito database"
        }

def add_test_documents() -> bool:
    email = 'aTestUser@gmail.com'
    user_pool_id = 'us-east-2_Y1d7huzBr' 
    cognito = boto3.client('cognito-idp')

    response = cognito.list_users(
        UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
            Limit=1 
    )
    user = None
    if 'Users' in response and len(response['Users']) <= 0:
        return False
    user = response['Users'][0]  # Assume the first user in the list is the correct one
    print("User found:", user["Username"])
    upload_file(user["Username"])
    return True

def post_file_to_rds(processing_opt: str, user_id: str):
    """
    Posts file to RDS
    """
    metadata = {
        "original_filename": "testForm.pdf",
        "bucket": f"owl-{processing_opt}",
        "user_id": user_id,               
        "doc_type": f"{processing_opt}",  
        "device": "PC",                      
        "ip": "7"                            
    }

    # print("Posting metadata to RDS:")
    # print(json.dumps(metadata, indent=2))

    rds_url = "https://wseuqafdc9.execute-api.us-east-2.amazonaws.com/test/api/v1/documents/rds"

    try:
        response = requests.post(rds_url, json=metadata, headers={"Content-Type": "application/json"})
        response.raise_for_status()
        response_json = response.json()
        
        filename = response_json['data']['filename']
        print("File posted to RDS successfully.")
        return filename

    except Exception as e:
        print(f"Error while posting to RDS: {str(e)}")
        return None

def post_file_to_s3(filename: str, b64_file: str, file_type: str, extracted_data: dict):
    """
    Posts the file to s3
    """
    transformed_data = transform_array_to_obj(extracted_data)
    body = {
        "file": b64_file,
        "fileName": filename,
        "type": file_type,
        "metadata": transformed_data
    }

    s3_url = "https://wseuqafdc9.execute-api.us-east-2.amazonaws.com/test/api/v1/documents/s3"
    
    try:
        response = requests.post(s3_url, json=body, headers={"Content-Type": "application/json"})
        response.raise_for_status()
        print("File posted to S3 successfully.")
    except Exception as e:
        print(f"Error while posting to S3: {str(e)}")

def transform_array_to_obj(arr: list) -> dict:
    """
    Transform array to object (you can adjust based on extracted data)
    """
    return {item['Key']: item['Value'] for item in arr}

def upload_file(user_id: str):
    """
    Upload the hardcoded base64 file
    """
    try:
        
        base64_image: list = [FILESTRING]
        document_type = "forms"
        
        print(f"Selected doc type: {document_type}")

        payload = {
            "docType": "form",
            "images": base64_image  
        }

        # access_token = get_access_token()

        ocr_url = "https://wseuqafdc9.execute-api.us-east-2.amazonaws.com/test/api/v1/documents/OCR"
        # print(payload)
        response = requests.post(ocr_url, json=payload, headers={"Content-Type": "application/json"})
        response.raise_for_status()  
        data = response.json()
        
        # filename = post_file_to_rds(document_type, user_id)
        # post_file_to_s3(filename, base64_image, document_type, data)
        
        # print(data)
        file_type = "application/pdf"
        
        print(f"Navigate to docValidate with data: {data} and file type: {file_type}")

    except Exception as e:
        print(f"Error: {str(e)}")


# def get_access_token() -> str:
#     payload = {
#         "aTestUser@gmail.com", 
#         "P@ssword123"
#     }
#     ocr_url = "https://wseuqafdc9.execute-api.us-east-2.amazonaws.com/test/api/v1/auth/login"
    # response = requests.post(ocr_url, json=payload, headers={"Content-Type": "application/json"})
    
    # if (response.ok):
    #     print(response)
    #     return response.get("accessToken")
    # else: 
    #     return None


def reset_rds() -> bool:
    sql = ["", "", "", ""]
    sql[0] = "DROP TABLE documents; "
    sql[1] = "DROP TABLE users; "
    sql[2] = "CREATE TABLE users ( user_id VARCHAR(255) NOT NULL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, firstname VARCHAR(255) NOT NULL, lastname VARCHAR(255) NOT NULL );"
    sql[3] = "CREATE TABLE documents ( filename VARCHAR(255) NOT NULL, original_filename VARCHAR(255) NOT NULL, bucket VARCHAR(255) NOT NULL, user_id VARCHAR(255) NOT NULL, doc_type VARCHAR(255) NOT NULL, upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, category VARCHAR(255) NULL, device VARCHAR(63) NULL, ip VARCHAR(127) NULL, PRIMARY KEY (filename, bucket), FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE );"
    for s in sql:
        response = execute(s)
        statusCode: int = 400
        try:
            statusCode = response["statusCode"]
        except:
            statusCode = response["ResponseMetadata"]["HTTPStatusCode"]
        if statusCode != 200:
            print(response)
            return False
    return True

def add_test_users() -> bool:
    """
    Adds a test User

    Return true if Succeed, False otherwise
    """
    try:
        payload = {
            'firstName': "Testing User's Name",
            'lastName': "[Yes My Last Name Has Bracke$s]",
            'email': "aTestUser@gmail.com",
            'password': "P@ssword123"
        }
        url = "https://wseuqafdc9.execute-api.us-east-2.amazonaws.com/test/api/v1/auth/register"
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, json=payload, headers=headers)
        print(response)
        if response.ok:
            return True
        else:
            data = response.json()
            error_message = data.get('message', 'Registration failed.')
            print(error_message)
            return False
    except Exception as e:
        print(str(e))
        return False

def delete_users() -> bool:
    """
    Attempts to delete all Users from Cognito

    Returns True is Success, False Otherwise
    """
    client = boto3.client('cognito-idp')
    user_pool_id = 'us-east-2_Y1d7huzBr' 

    try:
        users = []
        paginator = client.get_paginator('list_users')
        
        for page in paginator.paginate(UserPoolId=user_pool_id):
            users.extend(page['Users'])
        
        if users:
            for user in users:
                username = user['Username']
                try:
                    # Delete the user
                    client.admin_delete_user(
                        UserPoolId=user_pool_id,
                        Username=username
                    )
                    print(f"User {username} deleted successfully.")
                except Exception as e:
                    print(f"Error deleting user {username}: {str(e)}")
            return True
        else:
            return True
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return False

def reset_s3() -> bool:
    s3_client = boto3.client('s3')
    
    buckets = [
        {'bucket_name': 'owl-forms', 'folders': ['forms', 'metadata']},
        {'bucket_name': 'owl-ids', 'folders': ['ids', 'metadata']}
    ]
    
    for bucket in buckets:
        bucket_name = bucket['bucket_name']
        
        for folder in bucket['folders']:
            prefix = folder + '/'  
            
            response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
            
            if 'Contents' in response:
                for obj in response['Contents']:
                    object_key = obj['Key']
                    
                    if object_key == prefix:
                        continue
                    s3_client.delete_object(Bucket=bucket_name, Key=object_key)
                    print(f"Deleted {object_key} from {bucket_name}/{folder}")
            else:
                print(f"No objects found in {bucket_name}/{folder}")

    return True