import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { SERVER_URL, LOGIN_API_URL } from "../src/globals.tsx";

// Unit tests based on testing document
describe("CCS Unit Testing", function () {
  describe("Login - Server Side Validation", function () {
    it("should login with valid credentials", async function () {
      const ENDPOINT_URL = "/auth/login";
      const VALID_DATA = {
        email: "aTestUser@gmail.com",
        password: "P@ssword123",
      };

      try {
        const res = await request(SERVER_URL)
          .post(ENDPOINT_URL)
          .send(VALID_DATA)
          .set("Content-Type", "application/json");
        console.info(
          `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
        );
        expect(res.status).to.be.equal(StatusCodes.OK);
      } catch (err) {
        console.error(err);
        expect.fail();
      }
    });

    it("should fail to login with unregistered credentials", async function () {
      const ENDPOINT_URL = "/auth/login";
      const UNREGISTERED_DATA = {
        email: "unregistered@gmail.com",
        password: "UnregisteredP@ssword123",
      };

      try {
        const res = await request(SERVER_URL)
          .post(ENDPOINT_URL)
          .send(UNREGISTERED_DATA)
          .set("Content-Type", "application/json");
        console.info(
          `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
        );
        expect(res.status).to.be.equal(StatusCodes.UNAUTHORIZED);
      } catch (err) {
        console.error(err);
        expect.fail();
      }
    });

    it("should fail to login with wrong credentials", async function () {
      const ENDPOINT_URL = "/auth/login";
      const WRONG_DATA = {
        email: "aTestUser@gmail.com",
        password: "WrongP@ssword123",
      };

      try {
        const res = await request(SERVER_URL)
          .post(ENDPOINT_URL)
          .send(WRONG_DATA)
          .set("Content-Type", "application/json");
        console.info(
          `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
        );
        expect(res.status).to.be.equal(StatusCodes.UNAUTHORIZED);
      } catch (err) {
        console.error(err);
        expect.fail();
      }
    });
  });

  describe("Registration - Server Side Validation", function () {
    it("succesfully registers a new user", async function () {
      // Currently no way to call API to delete a user;
      // So rather than going onto AWS Cognito to manually delete the created user that
      // this test generates to ensure next call of testing passes, just create
      // random gmails
      function makeRandomGmail(length: number): string {
        let result = "";
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
          result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
          );
          counter += 1;
        }
        return result + "@gmail.com";
      }

      const ENDPOINT_URL = "/auth/register";
      const DATA = {
        firstName: "incredible",
        lastName: "name",
        email: makeRandomGmail(10),
        password: "P@ssword123",
      };

      try {
        const res = await request(SERVER_URL)
          .post(ENDPOINT_URL)
          .send(DATA)
          .set("Content-Type", "application/json");
        console.info(
          `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
        );
        expect(res.status).to.be.equal(StatusCodes.OK);
      } catch (err) {
        console.error(err);
        expect.fail();
      }
    });

    it("unsuccesfully tries registering with an Email ID already in use", async function () {
      const ENDPOINT_URL = "/auth/register";
      const WRONG_DATA = {
        firstName: "jebas",
        lastName: "gratzi",
        email: "aTestUser@gmail.com",
        password: "WrongP@ssword123",
      };

      try {
        const res = await request(SERVER_URL)
          .post(ENDPOINT_URL)
          .send(WRONG_DATA)
          .set("Content-Type", "application/json");
        console.info(
          `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
        );
        expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
      } catch (err) {
        console.error(err);
        expect.fail();
      }
    });
  });

  describe("API Endpoint Authentication", function () {
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

    describe("OCR Authentication", function () {
      it("should be valid OCR Auth call", async function () {
        const ENDPOINT_URL = "/documents/OCR";
        // Actual data being sent is irrlevent; we're testing authorization
        const DATA = {
          original_filename: "nope",
          bucket: "irrelevent",
          user_id: "irr",
          doc_type: "yes",
        };

        try {
          const res = await request(SERVER_URL)
            .post(ENDPOINT_URL)
            .send(DATA)
            .set({
              "Content-Type": "application/json",
              Authorization: accessToken,
            });
          console.info(
            `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
          );
          // Expecting 400 since data is bad
          expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
        } catch (err) {
          console.error(err);
          expect.fail();
        }
      });

      it("should be invalid access token for OCR Auth call", async function () {
        const ENDPOINT_URL = "/documents/OCR";
        const wrongAccessToken = "thisTokenIsInvalid";
        const DATA = {
          original_filename: "nope",
          bucket: "irrelevent",
          user_id: "irr",
          doc_type: "yes",
        };

        try {
          const res = await request(SERVER_URL)
            .post(ENDPOINT_URL)
            .send(DATA)
            .set({
              "Content-Type": "application/json",
              Authorization: wrongAccessToken,
            });
          console.info(
            `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
          );
          expect(res.status).to.be.equal(StatusCodes.UNAUTHORIZED);
        } catch (err) {
          console.error(err);
          expect.fail();
        }
      });

      it("has no authentication token for OCR Auth call", async function () {
        const ENDPOINT_URL = "/documents/OCR";
        const DATA = {
          original_filename: "nope",
          bucket: "irrelevent",
          user_id: "irr",
          doc_type: "yes",
        };

        try {
          const res = await request(SERVER_URL)
            .post(ENDPOINT_URL)
            .send(DATA)
            .set({
              "Content-Type": "application/json",
            });
          console.info(
            `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
          );
          expect(res.status).to.be.equal(StatusCodes.UNAUTHORIZED);
        } catch (err) {
          console.error(err);
          expect.fail();
        }
      });
    });

    describe("S3 Authentication", function () {
      it("should be valid S3 Auth call", async function () {
        const ENDPOINT_URL = "/documents/s3";
        // Actual data being sent is irrlevent; we're testing authorization
        const DATA = {
          original_filename: "nope",
          bucket: "irrelevent",
          user_id: "irr",
          doc_type: "yes",
        };

        try {
          const res = await request(SERVER_URL)
            .post(ENDPOINT_URL)
            .send(DATA)
            .set({
              "Content-Type": "application/json",
              Authorization: accessToken,
            });
          console.info(
            `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
          );
          // Expecting 400 since data is bad
          expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
        } catch (err) {
          console.error(err);
          expect.fail();
        }
      });

      it("should be invalid access token for S3 Auth call", async function () {
        const ENDPOINT_URL = "/documents/s3";
        const wrongAccessToken = "thisTokenIsInvalid";
        const DATA = {
          original_filename: "nope",
          bucket: "irrelevent",
          user_id: "irr",
          doc_type: "yes",
        };

        try {
          const res = await request(SERVER_URL)
            .post(ENDPOINT_URL)
            .send(DATA)
            .set({
              "Content-Type": "application/json",
              Authorization: wrongAccessToken,
            });
          console.info(
            `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
          );
          expect(res.status).to.be.equal(StatusCodes.UNAUTHORIZED);
        } catch (err) {
          console.error(err);
          expect.fail();
        }
      });

      it("has no authentication token for S3 Auth call", async function () {
        const ENDPOINT_URL = "/documents/s3";
        const DATA = {
          original_filename: "nope",
          bucket: "irrelevent",
          user_id: "irr",
          doc_type: "yes",
        };

        try {
          const res = await request(SERVER_URL)
            .post(ENDPOINT_URL)
            .send(DATA)
            .set({
              "Content-Type": "application/json",
            });
          console.info(
            `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
          );
          expect(res.status).to.be.equal(StatusCodes.UNAUTHORIZED);
        } catch (err) {
          console.error(err);
          expect.fail();
        }
      });
    });

    describe("RDS Authentication", function () {
      it("should be valid RDS Auth call", async function () {
        const ENDPOINT_URL = "/documents/rds";
        // Actual data being sent is irrlevent; we're testing authorization
        const DATA = {
          data: "irrelevent",
          money: "imbroke",
        };

        try {
          const res = await request(SERVER_URL)
            .post(ENDPOINT_URL)
            .send(DATA)
            .set({
              "Content-Type": "application/json",
              Authorization: accessToken,
            });
          console.info(
            `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
          );
          // Expecting 400 since data is bad
          expect(res.status).to.be.equal(StatusCodes.BAD_REQUEST);
        } catch (err) {
          console.error(err);
          expect.fail();
        }
      });

      it("should be invalid access token for RDS Auth call", async function () {
        const ENDPOINT_URL = "/documents/s3";
        const wrongAccessToken = "thisTokenIsInvalid";
        const DATA = {
          original_filename: "nope",
          bucket: "irrelevent",
          user_id: "irr",
          doc_type: "yes",
        };

        try {
          const res = await request(SERVER_URL)
            .post(ENDPOINT_URL)
            .send(DATA)
            .set({
              "Content-Type": "application/json",
              Authorization: wrongAccessToken,
            });
          console.info(
            `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
          );
          expect(res.status).to.be.equal(StatusCodes.UNAUTHORIZED);
        } catch (err) {
          console.error(err);
          expect.fail();
        }
      });

      it("has no authentication token for RDS Auth call", async function () {
        const ENDPOINT_URL = "/documents/s3";
        const DATA = {
          original_filename: "nope",
          bucket: "irrelevent",
          user_id: "irr",
          doc_type: "yes",
        };

        try {
          const res = await request(SERVER_URL)
            .post(ENDPOINT_URL)
            .send(DATA)
            .set({
              "Content-Type": "application/json",
            });
          console.info(
            `POST request to ${SERVER_URL}${ENDPOINT_URL}, status ${res.status}`
          );
          expect(res.status).to.be.equal(StatusCodes.UNAUTHORIZED);
        } catch (err) {
          console.error(err);
          expect.fail();
        }
      });
    });
  });
});
