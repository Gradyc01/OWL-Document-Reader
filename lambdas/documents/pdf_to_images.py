import base64
import json
# PyMuPDF (fitz) is used for PDF processing.
# Licensed under GPL v3 (or AGPL v3) - verify your version.
# See THIRD_PARTY_LICENSES.md for full attribution details.
import fitz  
from io import BytesIO
# Pillow (PIL) is used for image processing.
# Licensed under the Pillow License (HPND).
# See LICENSE.md for full attribution details.
from PIL import Image

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

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

        # Decode base64 PDF to bytes
        pdf_bytes = base64.b64decode(pdf_base64)

        # Open PDF from bytes
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        image_base64_list = []

        for page in doc:
            pix = page.get_pixmap(dpi=100) # 200 for better quality but with some timeout issues
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            # Convert image to base64-encoded PNG
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

            image_base64_list.append(img_base64)

        return {
            'statusCode': 200,
            "headers": CORS_HEADERS,
            'body': json.dumps({
                'message': 'File converted successfully.',
                'image_list': image_base64_list
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            "headers": CORS_HEADERS,
            'body': f'Error processing PDF: {str(e)}'
        }
