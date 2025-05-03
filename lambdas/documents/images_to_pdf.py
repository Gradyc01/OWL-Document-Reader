import base64
import json
import io
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
        # Assume input format: { "images": ["base64string1", "base64string2", ...] }
        base64_images = body.get("images", [])

        if not base64_images:
            return {
                'statusCode': 400,
                "headers": CORS_HEADERS,
                'body': json.dumps({'error': "Input Error: 'base64_images' key not found or is empty in the event payload."})
            }

        # Convert base64 strings to PIL images
        pil_images = []
        for b64_img in base64_images:
            image_data = base64.b64decode(b64_img)
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            pil_images.append(image)

        # Create PDF in memory
        pdf_bytes_io = io.BytesIO()
        pil_images[0].save(
            pdf_bytes_io,
            format="PDF",
            save_all=True,
            append_images=pil_images[1:]
        )
        pdf_bytes = pdf_bytes_io.getvalue()

        # Encode PDF to base64
        encoded_pdf = base64.b64encode(pdf_bytes).decode("utf-8")

        return {
            'statusCode': 200,
            "headers": CORS_HEADERS,
            'body': json.dumps({
                'message': 'Images converted successfully.',
                'pdf_base64': encoded_pdf
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": f"Error: {str(e)}"
        }
