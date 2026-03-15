"use client";

import { useEffect, useRef, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

type Props = {
  roomId: string;
  userId: string;
  userName: string;
};

export default function MeetingRoom({ roomId, userId, userName }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let zegoInstance: ZegoUIKitPrebuilt | null = null;

    const joinRoom = async () => {
      const appId = Number(process.env.NEXT_PUBLIC_ZEGOCLOUD_APPID || 0);
      const serverSecret = process.env.NEXT_PUBLIC_ZEGOCLOUD_SERVERSECRET || "";
      let kitToken: string | undefined;

      if (appId && serverSecret) {
        kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appId,
          serverSecret,
          roomId,
          String(userId),
          userName
        );
      } else {
        let response: Response;

        try {
          response = await fetch("/api/zego/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId, userId, userName }),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(`Network error: ${msg}`);
          return;
        }

        if (!response.ok) {
          let message = `Server error (${response.status})`;
          try {
            const payload = (await response.json()) as { error?: string };
            if (payload?.error) {
              message = payload.error;
            }
          } catch {
            // Ignore parse errors
          }
          setError(message);
          return;
        }

        let payload: { kitToken?: string };
        try {
          payload = (await response.json()) as { kitToken?: string };
        } catch {
          setError("Invalid server response");
          return;
        }

        kitToken = payload.kitToken;
      }

      if (!kitToken) {
        setError("Missing video token.");
        return;
      }

      if (!containerRef.current) {
        return;
      }

      try {
        // Initialize Zego with the token
        zegoInstance = ZegoUIKitPrebuilt.create(kitToken);
        
        // Join the room
        await zegoInstance.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          sharedLinks: [
            {
              name: "Copy Meeting Link",
              url: `${window.location.origin}/meet/${roomId}`,
            },
          ],
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Zego join error:", msg, err);
        setError(`Failed to join: ${msg}`);
      }
    };

    joinRoom();

    return () => {
      try {
        zegoInstance?.destroy();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [roomId, userId, userName]);

  return (
    <section className="mt-4">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div ref={containerRef} style={{ width: "100%", minHeight: 520 }} />
    </section>
  );
}
