import { NextResponse } from "next/server";

async function fetchWithTimeout(url: string, options: any, timeout = 8000) {
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, timeout);

    fetch(url, options)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    const firebaseUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL;

    if (!firebaseUrl) {
      return NextResponse.json(
        { error: "Firebase URL bulunamadı (.env.local)" },
        { status: 500 }
      );
    }

    console.log("FIREBASE URL:", firebaseUrl);

    const fetchOptions = {
      method: "POST",
      cache: "no-store", // revalidate KULLANMIYORUZ
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history || [] }),
    };

    let response: Response;

    try {
      response = await fetchWithTimeout(firebaseUrl, fetchOptions, 8000);
    } catch (err) {
      console.log("⏳ Timeout oldu, yeniden deneniyor...");
      response = await fetchWithTimeout(firebaseUrl, fetchOptions, 8000);
    }

    // Eğer buraya geldiyse response kesinlikle Fetch Response objesidir.
    const data = await response.json();
    console.log("FIREBASE RAW:", data);

    if (!data.text) {
      return NextResponse.json(
        { error: "AI yanıtı alınamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json({ text: data.text });
  } catch (err: any) {
    console.error("Chat API Error:", err);
    return NextResponse.json(
      { error: "Connection failed: " + err.message },
      { status: 500 }
    );
  }
}
