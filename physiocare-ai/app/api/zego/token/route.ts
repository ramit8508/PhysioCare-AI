import { NextResponse } from "next/server";
import crypto from "crypto";

function generateAccessToken(
  appId: number,
  userId: string,
  serverSecret: string
): string {
  const expireTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  
  // Create payload
  const payload = {
    app_id: appId,
    user_id: userId,
    ctime: Math.floor(Date.now() / 1000),
    expire: expireTime,
    nonce: Math.floor(Math.random() * 2147483647),
  };

  // Convert to JSON and then to Buffer
  const payloadStr = JSON.stringify(payload);
  const payloadBuf = Buffer.from(payloadStr);

  // Create HMAC signature
  const hmac = crypto.createHmac("sha256", serverSecret);
  hmac.update(payloadBuf);
  const signature = hmac.digest();

  // Combine signature + payload and base64 encode
  return Buffer.concat([signature, payloadBuf]).toString("base64");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      roomId?: string;
      userId?: string;
      userName?: string;
    };

    if (!body.roomId || !body.userId || !body.userName) {
      return NextResponse.json({ error: "Missing fields: roomId, userId, userName" }, { status: 400 });
    }

    const appId = Number(process.env.ZEGOCLOUD_APPID || 0);
    const serverSecret = process.env.ZEGOCLOUD_SERVERSECRET || "";

    if (!appId || !serverSecret) {
      console.error("Zego config missing: appId=" + appId + " secret=" + (serverSecret ? "set" : "unset"));
      return NextResponse.json({ error: "Zego config missing" }, { status: 500 });
    }

    // Generate access token
    const accessToken = generateAccessToken(appId, body.userId, serverSecret);

    return NextResponse.json({ 
      kitToken: accessToken, 
      appId,
      userId: body.userId,
      roomId: body.roomId,
      userName: body.userName 
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Zego token error:", errMsg, error);
    return NextResponse.json(
      { error: `Token generation failed: ${errMsg}` },
      { status: 500 }
    );
  }
}
