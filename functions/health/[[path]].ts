const BACKEND_URL = "https://halsabbah-depscreen.hf.space";

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const backendUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  const response = await fetch(backendUrl, {
    method: context.request.method,
    headers: context.request.headers,
    redirect: "follow",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};
