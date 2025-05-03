import base64
import json
from io import BytesIO
from pypdf import PdfReader, PdfWriter

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

# https://pypdf.readthedocs.io/en/latest/user/file-size.html
def compress_pdf(input_pdf_base64: str) -> str:
    # Decode base64 to bytes
    pdf_bytes = base64.b64decode(input_pdf_base64)
    
    # Check size threshold (500 KB)
    if len(pdf_bytes) < 500 * 1024:
        return input_pdf_base64
    
    # Use BytesIO to treat the bytes like a file
    input_pdf_stream = BytesIO(pdf_bytes)
    
    # Create a PdfReader from the stream
    reader = PdfReader(input_pdf_stream)
    writer = PdfWriter()
    
    for page in reader.pages:
        writer.add_page(page)
    
    writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)

    for page in writer.pages:
        page.compress_content_streams()
        for img in page.images:
            img.replace(img.image, quality=40)
    
    # Write the output to a BytesIO stream
    output_pdf_stream = BytesIO()
    writer.write(output_pdf_stream)
    
    # Get the bytes and encode back to base64
    compressed_pdf_bytes = output_pdf_stream.getvalue()
    return base64.b64encode(compressed_pdf_bytes).decode("utf-8")


def lambda_handler(event, context):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "CORS preflight success"})
            }

        if isinstance(event, str):
            return {
                'statusCode': 400,
                "headers": CORS_HEADERS,
                'body': json.dumps({'error': f"event is a string: {e}"})
            }

        body = json.loads(event["body"])
        pdf_base64 = body.get('pdf_base64')

        if not pdf_base64:
            logger.error("Missing 'pdf_base64' in input event.")
            return {
                'statusCode': 400,
                "headers": CORS_HEADERS,
                'body': json.dumps({'error': "Input Error: 'pdf_base64' key not found or is empty in the event payload."})
            }

        compressed_pdf = compress_pdf(pdf_base64)

        return {
            'statusCode': 200,
            "headers": CORS_HEADERS,
            'body': json.dumps({
                'message': 'File converted successfully.',
                'compressed_pdf': compressed_pdf
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            "headers": CORS_HEADERS,
            'body': f'Error processing PDF: {str(e)}'
        }
