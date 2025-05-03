import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { LOGIN_API_URL } from "../src/globals.tsx";
import { readFileSync } from "fs";
import { SERVER_URL } from "../src/globals.tsx";

/**
 * Convert a file into a base64 string.
 *
 * @param name  The name of the file to be converted.
 *
 * @return Promise A base 64 representation of the file
 */
async function getContentFromArchives(name: string): Promise<string> {
  const buffer = readFileSync("test/resources/" + name);
  return buffer.toString("base64");
}

describe("NFR Testing", function () {

  describe("Get Access Token", function () {
    let accessToken: string = "";

    before(async function () {
      //Login to aTestUser@gmail.com to get valid access token
      const payload = { email: "aTestUser@gmail.com", password: "P@ssword123" };

      const response = await fetch(`${LOGIN_API_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      accessToken = data.accessToken;
      console.log(
        `AccessToken first 10 chars: ${accessToken.substring(0, 10)}`
      );
    });

    // Note that a number greater than 10 will cause failure count > 0
    const numToUpload: number = 10;
    describe(`Async Uploading ${numToUpload} docs to RDS and S3`, async function () {
      let b64File: string;
      let myFileName: string = "testform123.pdf";

      before(async function () {
        b64File = await getContentFromArchives(myFileName);
      });

      it(`should upload ${numToUpload} of same doc to S3 and RDS`, async function () {
        const S3_ENDPOINT_URL = "/documents/s3";
        const RDS_ENDPOINT_URL = "/documents/rds";

        const METADATA = {
          original_filename: myFileName,
          bucket: "owl-forms",
          user_id: "519be550-1091-702e-5052-da4904a9894e",
          doc_type: "forms",
        };

        let s3FileName: string = "";

        const results = {
          rdsFail: 0,
          s3Fail: 0,
        };

        async function uploadAll() {
          try {
            const res = await request(SERVER_URL)
              .post(RDS_ENDPOINT_URL)
              .send(METADATA)
              .set({
                "Content-Type": "application/json",
                Authorization: accessToken,
              });

            if (res.status === StatusCodes.OK) {
              const resJson = res.body;
              s3FileName = resJson.data.filename;
            } else {
              results.rdsFail++;
            }
          } catch (err) {
            results.rdsFail++;
          }

          try {
            const DATA = {
              file: b64File,
              fileName: s3FileName,
              type: "forms",
              metadata: {
                "Membership Number:": "1234567",
                "Business (Corporation) Name": "hehexd",
                "Approved By": "Jeff La",
                Date: "02/26",
                "Trade Name": "CoolTradeName",
                Address: "1234 University Blvd.",
                "Postal Code": "V123",
                City: "Vancouver",
                Prov: "BC",
                Phone: "7789998888",
                UNDERTAKING: "",
                "Revised:": "October 31. 2018",
                Owner: "Commercial Banking Operations",
                Page: "2",
                Signature: "AAAAAAAAAAAAAAAA",
              },
            };

            const res = await request(SERVER_URL)
              .post(S3_ENDPOINT_URL)
              .send(DATA)
              .set({
                "Content-Type": "application/json",
                Authorization: accessToken,
              });

            if (res.status !== StatusCodes.OK) {
              results.s3Fail++;
            }
          } catch (err) {
            results.s3Fail++;
          }
        }

        const allPromises = Array.from({ length: numToUpload }, () =>
          uploadAll()
        );

        try {
          await Promise.all(allPromises);
          console.log(`
            === UPLOAD TEST RESULTS ===
            Total Attempted: ${numToUpload}
            RDS Failed: ${results.rdsFail}
            S3 Failed: ${results.s3Fail}
            ========================
                `);
        } catch (err) {
          console.log(`file upload fail`);
        }
      });
    });
  });
});
