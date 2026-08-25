/*
==================================================
QTM AI V2
API KEY + CHAT BACKEND
==================================================
*/

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-QTM-Key",
        "Access-Control-Allow-Methods":
          "GET, POST, OPTIONS"
      }
    }
  );
}


/* Generate random API key */

function generateKey() {

  const bytes =
    crypto.getRandomValues(
      new Uint8Array(24)
    );

  const hex =
    [...bytes]
      .map(
        b => b
          .toString(16)
          .padStart(2, "0")
      )
      .join("");

  return "qtm_live_" + hex;
}


/* SHA-256 */

async function hashKey(key) {

  const data =
    new TextEncoder()
      .encode(key);

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return [...new Uint8Array(hash)]
    .map(
      b => b
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}


/* MAIN */

export default {

  async fetch(request, env) {

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, X-QTM-Key",
            "Access-Control-Allow-Methods":
              "GET, POST, OPTIONS"
          }
        }
      );

    }


    const url =
      new URL(request.url);


    /* HEALTH */

    if (
      url.pathname ===
      "/api/health"
    ) {

      return json({
        ok: true,
        name: "QTM AI",
        version: "V2"
      });

    }


    /*
    ================================================
    CREATE API KEY
    ================================================
    */

    if (
      url.pathname ===
      "/api/keys/create" &&
      request.method ===
      "POST"
    ) {

      const key =
        generateKey();

      const hash =
        await hashKey(key);


      /*
      Store hash in KV.

      The actual key is returned
      ONLY once to the user.
      */

      await env.QTM_KEYS.put(
        hash,
        JSON.stringify({
          createdAt:
            new Date().toISOString(),

          requests: 0
        })
      );


      return json({

        success: true,

        api_key: key,

        warning:
          "Save this API key now. " +
          "It will not be shown again."

      });

    }


    /*
    ================================================
    CHAT API
    ================================================
    */

    if (
      url.pathname ===
      "/v1/chat" &&
      request.method ===
      "POST"
    ) {

      const key =
        request.headers.get(
          "X-QTM-Key"
        );


      if (!key) {

        return json(
          {
            error:
              "Missing QTM API key."
          },
          401
        );

      }


      const hash =
        await hashKey(key);


      const stored =
        await env.QTM_KEYS.get(
          hash
        );


      if (!stored) {

        return json(
          {
            error:
              "Invalid QTM API key."
          },
          401
        );

      }


      const account =
        JSON.parse(stored);


      /*
      Basic usage limit.
      */

      if (
        account.requests >= 100
      ) {

        return json(
          {
            error:
              "API request limit reached."
          },
          429
        );

      }


      const body =
        await request.json();


      const messages =
        Array.isArray(
          body.messages
        )
          ? body.messages
          : [];


      if (
        messages.length === 0
      ) {

        return json(
          {
            error:
              "messages is required."
          },
          400
        );

      }


      /*
      QTM AI personality
      */

      const system = {

        role: "system",

        content:
          "You are QTM AI. " +
          "You are a helpful, intelligent " +
          "general-purpose AI assistant. " +
          "Give accurate, clear and useful " +
          "answers. Never deliberately invent " +
          "facts. Explain complex subjects " +
          "in a simple way."

      };


      try {

        const result =
          await env.AI.run(
            "@cf/zai-org/glm-4.7-flash",
            {

              messages: [

                system,

                ...messages.slice(-20)

              ]

            }
          );


        const answer =
          result.response ||
          result.result?.response ||
          "No answer."


        /*
        Increase usage count
        */

        account.requests++;

        await env.QTM_KEYS.put(
          hash,
          JSON.stringify(account)
        );


        return json({

          success: true,

          model:
            "QTM AI",

          answer:

            answer,

          usage: {

            requests:
              account.requests

          }

        });


      } catch (error) {

        return json(
          {
            error:
              "AI generation failed.",

            details:
              String(error)
          },
          500
        );

      }

    }


    /*
    ================================================
    404
    ================================================
    */

    return json(
      {
        error:
          "QTM AI endpoint not found."
      },
      404
    );

  }

};
