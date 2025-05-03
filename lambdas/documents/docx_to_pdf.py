import base64
import json
import logging
import os
import uuid
import time

try:
    # Adobe PDF Services SDK is used for converting DOCX to PDF.
    # This library is licensed under Adobe’s license terms.
    # Please refer to LICENSE.md for full attribution and license details.
    from adobe.pdfservices.operation.auth.service_principal_credentials import ServicePrincipalCredentials
    from adobe.pdfservices.operation.exception.exceptions import ServiceApiException, ServiceUsageException, SdkException
    from adobe.pdfservices.operation.io.cloud_asset import CloudAsset
    from adobe.pdfservices.operation.io.stream_asset import StreamAsset
    from adobe.pdfservices.operation.pdf_services import PDFServices
    from adobe.pdfservices.operation.pdf_services_media_type import PDFServicesMediaType
    from adobe.pdfservices.operation.pdfjobs.jobs.create_pdf_job import CreatePDFJob
    from adobe.pdfservices.operation.pdfjobs.result.create_pdf_result import CreatePDFResult
except ImportError as e:
    logging.error(f"Adobe PDF Services SDK not found. Please include it in your deployment package or layer. {e}")
    # Define dummy classes or raise an error if you want to prevent execution without the SDK
    raise Exception("Adobe PDF Services SDK not found.")


logger = logging.getLogger()
logger.setLevel(logging.INFO)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

def lambda_handler(event, context):
    """
    Handles the lambda for getting converting the provided base64 DOCX file to a base64 PDF file

    Input:
        event: 
            base64_docx = the file to convert, in base64
        context:
            Not used

    Output: 
        returns the response from executing the statement with a json message
    """

    input_docx_path = None
    output_pdf_path = None
    start_time = time.time()

    try:
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "CORS preflight success"})
            }

        client_id = os.environ.get('CLIENT_ID')
        client_secret = os.environ.get('CLIENT_SECRET')

        if not client_id or not client_secret:
            logger.error("CLIENT_ID or CLIENT_SECRET environment variables not set.")
            return {
                'statusCode': 500,
                "headers": CORS_HEADERS,
                'body': json.dumps({'error': 'Server configuration error: Missing credentials.'})
            }

        # 2. Get Base64 encoded DOCX from input event
        # Assuming the base64 string is directly in the event or under a specific key
        if isinstance(event, str):
            return {
                'statusCode': 400,
                "headers": CORS_HEADERS,
                'body': json.dumps({'error': f"event is a string: {e}"})
            }

        body = json.loads(event["body"])
        base64_docx_string = body.get('base64_docx')

        if not base64_docx_string:
            logger.error("Missing 'base64_docx' in input event.")
            return {
                'statusCode': 400,
                "headers": CORS_HEADERS,
                'body': json.dumps({'error': "Input Error: 'base64_docx' key not found or is empty in the event payload."})
            }

        try:
            docx_bytes = base64.b64decode(base64_docx_string)
        except base64.binascii.Error as e:
             logger.error(f"Invalid Base64 input string: {e}")
             return {
                 'statusCode': 400,
                 "headers": CORS_HEADERS,
                 'body': json.dumps({'error': 'Input Error: Invalid Base64 encoding for DOCX file.'})
             }

        unique_id = uuid.uuid4()
        input_docx_path = f"/tmp/{unique_id}_input.docx"
        output_pdf_path = f"/tmp/{unique_id}_output.pdf"

        logger.info(f"Writing decoded DOCX to temporary file: {input_docx_path}")
        with open(input_docx_path, "wb") as f:
            f.write(docx_bytes)
        logger.info(f"Input DOCX file size: {os.path.getsize(input_docx_path)} bytes")

        logger.info("Initializing Adobe PDF Services SDK...")
        credentials = ServicePrincipalCredentials(
            client_id=client_id,
            client_secret=client_secret
        )

        pdf_services = PDFServices(credentials=credentials)

        # maybe streamline later
        file = open(input_docx_path, 'rb')
        input_stream = file.read()
        file.close()

        input_asset = pdf_services.upload(input_stream=input_stream, mime_type=PDFServicesMediaType.DOCX)

        create_pdf_job = CreatePDFJob(input_asset)

        logger.info("Executing PDF creation operation...")
        location = pdf_services.submit(create_pdf_job)
        pdf_services_response = pdf_services.get_job_result(location, CreatePDFResult)
        logger.info("PDF creation successful.")

        result_asset: CloudAsset = pdf_services_response.get_result().get_asset()
        stream_asset: StreamAsset = pdf_services.get_content(result_asset)

        with open(output_pdf_path, "wb") as file:
            file.write(stream_asset.get_input_stream())
        logger.info(f"Output PDF saved temporarily to: {output_pdf_path}")
        logger.info(f"Output PDF file size: {os.path.getsize(output_pdf_path)} bytes")

        logger.info("Reading generated PDF and encoding to Base64...")
        with open(output_pdf_path, "rb") as pdf_file:
            pdf_bytes = pdf_file.read()

        base64_pdf_string = base64.b64encode(pdf_bytes).decode('utf-8')
        logger.info("PDF encoded successfully.")

        end_time = time.time()
        logger.info(f"Total execution time: {end_time - start_time:.2f} seconds")

        return {
            'statusCode': 200,
            "headers": CORS_HEADERS,
            'body': json.dumps({
                'message': 'File converted successfully.',
                'base64_pdf': base64_pdf_string
            }),
        }

    except (ServiceApiException, ServiceUsageException, SdkException) as e:
        logger.exception(f"Adobe SDK Error: {e}")
        return {
            'statusCode': 500,
            "headers": CORS_HEADERS,
            'body': json.dumps({'error': f'Adobe PDF Services API error: {e}'})
        }
    except FileNotFoundError as e:
         logger.exception(f"File system error (likely /tmp access): {e}")
         return {
             'statusCode': 500,
             "headers": CORS_HEADERS,
             'body': json.dumps({'error': f'Internal server error: File system issue ({e})'})
         }
    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")
        return {
            'statusCode': 500,
            "headers": CORS_HEADERS,
            'body': json.dumps({'error': f'An unexpected internal server error occurred: {e}'})
        }

    finally:
        logger.info("Cleaning up temporary files...")
        if input_docx_path and os.path.exists(input_docx_path):
            try:
                os.remove(input_docx_path)
                logger.info(f"Removed temporary input file: {input_docx_path}")
            except OSError as e:
                 logger.error(f"Error removing temporary input file {input_docx_path}: {e}")
        if output_pdf_path and os.path.exists(output_pdf_path):
            try:
                os.remove(output_pdf_path)
                logger.info(f"Removed temporary output file: {output_pdf_path}")
            except OSError as e:
                logger.error(f"Error removing temporary output file {output_pdf_path}: {e}")
