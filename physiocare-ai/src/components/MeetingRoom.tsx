"use client";

import { useEffect, useRef, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { Maximize2, X, AlertCircle, HelpCircle } from "lucide-react";

type Props = {
  roomId: string;
  userId: string;
  userName: string;
  fullScreen?: boolean;
  onCallEnd?: () => void;
};

export default function MeetingRoom({ roomId, userId, userName, fullScreen, onCallEnd }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zegoRef = useRef<ZegoUIKitPrebuilt | null>(null);
  const initRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const joinRoom = async () => {
      if (initRef.current) {
        return;
      }
      initRef.current = true;
      setInitializing(true);
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
          if (mounted) {
            setError(`Network error: ${msg}`);
            setInitializing(false);
          }
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
          if (mounted) {
            setError(message);
            setInitializing(false);
          }
          return;
        }

        let payload: { kitToken?: string };
        try {
          payload = (await response.json()) as { kitToken?: string };
        } catch {
          if (mounted) {
            setError("Invalid server response");
            setInitializing(false);
          }
          return;
        }

        kitToken = payload.kitToken;
      }

      if (!kitToken) {
        if (mounted) {
          setError("Missing video token.");
          setInitializing(false);
        }
        return;
      }

      if (!containerRef.current) {
        if (mounted) {
          setInitializing(false);
        }
        initRef.current = false;
        return;
      }

      try {
        containerRef.current.innerHTML = "";

        // Initialize Zego with the token
        const zegoInstance = ZegoUIKitPrebuilt.create(kitToken);
        zegoRef.current = zegoInstance;
        
        // Join the room
        zegoInstance.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          showRoomDetailsButton: true,
          showRoomTimer: true,
          showMyCameraToggleButton: true,
          showMyMicrophoneToggleButton: true,
          showAudioVideoSettingsButton: true,
          showTextChat: true,
          showUserList: true,
          showLayoutButton: true,
          autoHideFooter: false,
          onLeaveRoom: () => {
            onCallEnd?.();
          },
        });

        window.setTimeout(() => {
          if (mounted) {
            setInitializing(false);
          }
        }, 1200);

        if (mounted) {
          setError(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Zego join error:", msg, err);
        if (mounted) {
          setError(`Failed to join: ${msg}`);
          setInitializing(false);
        }
      } finally {
        initRef.current = false;
      }
    };

    joinRoom();

    return () => {
      mounted = false;
      try {
        zegoRef.current?.destroy();
        zegoRef.current = null;
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [roomId, userId, userName, onCallEnd]);

  return (
    <div className={fullScreen ? "w-full h-full flex flex-col bg-slate-900" : "flex flex-col gap-4 bg-linear-to-br from-slate-50 via-blue-50 to-slate-50 rounded-2xl border-2 border-slate-200 overflow-hidden shadow-2xl"}>
      {/* Header */}
      {!fullScreen && (
        <div className="bg-linear-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <span className="text-lg">📹</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Live Telehealth Session</h3>
                <p className="text-emerald-50 text-xs">Connected with {userName || 'participant'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mx-4 mt-4 bg-rose-50 border-l-4 border-rose-500 rounded-lg p-4 flex gap-3 items-start">
          <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-900">Connection Error</p>
            <p className="text-sm text-rose-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {initializing && !error && (
        <div className="mx-4 mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm text-muted-foreground">Camera Initializing...</p>
        </div>
      )}

      {/* Video Container */}
      <div 
        className={fullScreen 
          ? "flex-1 w-full relative bg-slate-900 overflow-hidden" 
          : "relative shrink-0 mx-4 mt-2 rounded-xl overflow-hidden border-2 border-emerald-100 shadow-lg bg-slate-900"
        }
        ref={containerRef} 
        style={{ 
          width: fullScreen ? "100%" : "auto", 
          height: fullScreen ? "100%" : "380px",
          overflow: "hidden",
        }} 
      />

      {/* Footer Controls - Desktop */}
      {!fullScreen && (
        <div className="px-6 pb-6">
          <div className="bg-white border-2 border-emerald-100 rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <HelpCircle size={18} />
                <p className="text-sm font-medium">Use the video controls above to manage your session</p>
              </div>
              <button
                onClick={() => {
                  const opened = window.open(`/meet/${roomId}`, "_blank");
                  if (!opened) {
                    window.location.href = `/meet/${roomId}`;
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                <Maximize2 size={18} />
                Full Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Button - Full Screen */}
      {fullScreen && (
        <button
          onClick={() => window.close()}
          className="absolute top-4 right-4 w-12 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl z-50 shrink-0"
          title="Close session"
        >
          <X size={24} />
        </button>
      )}
    </div>
  );
}
