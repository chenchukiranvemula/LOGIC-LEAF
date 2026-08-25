/*
==================================================
QTM AI V1 BACKEND
Cloudflare Workers AI
==================================================
*/

export default {

  async fetch(request, env) {

    const cors = {

      "Access-Control-Allow-Origin": "*",

      "Access-Control-Allow-Headers":
        "Content-Type, Authorization",

      "Access-Control-Allow-Methods":
        "POST, OPTIONS"

    };


    /* CORS */

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(
        null,
        {
          headers: cors
        }
      );

    }


    const url =
      new URL(request.url);


    /* HEALTH CHECK */

    if (
      url.pathname ===
      "/api/health"
    ) {

      return Response.json(
        {
          ok: true,
          name: "QTM AI",
          version: "V1"
        },
        {
          headers: cors
        }
      );

    }


    /* CHAT */

    if (
      url.pathname ===
      "/api/chat" &&
      request.method ===
      "POST"
    ) {

      try {

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

          return Response.json(
            {
              error:
                "Messages are required."
            },
            {
              status: 400,
              headers: cors
            }
          );

        }


        /*
        QTM AI SYSTEM PROMPT
        */

        const systemPrompt = {

          role: "system",

          content:
            "You are QTM AI, a helpful " +
            "general-purpose AI assistant. " +
            "Give clear, accurate and useful " +
            "answers. Explain difficult topics " +
            "simply. If you do not know something, " +
            "say that you are uncertain instead " +
            "of inventing information."

        };


        /*
        RUN AI MODEL
        */

        const result =
          await env.AI.run(
            "@cf/zai-org/glm-4.7-flash",
            {

              messages: [

                systemPrompt,

                ...messages.slice(-20)

              ]

            }
          );


        const answer =
          result.response ||
          result.result?.response ||
          "No response received.";


        return Response.json(
          {
            answer: answer
          },
          {
            headers: cors
          }
        );


      } catch (error) {

        return Response.json(
          {
            error:
              "QTM AI backend error.",

            details:
              String(error)
          },
          {
            status: 500,
            headers: cors
          }
        );

      }

    }


    /* NOT FOUND */

    return Response.json(
      {
        error: "Endpoint not found."
      },
      {
        status: 404,
        headers: cors
      }
    );

  }

};
