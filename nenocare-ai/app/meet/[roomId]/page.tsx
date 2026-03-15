import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import MeetingRoom from "./MeetingRoom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MeetingRoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const userName = session.role === "DOCTOR" ? "Doctor" : "Patient";

  return (
    <main className="page-shell">
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Telehealth Session</h1>
          <p className="page-subtitle">Room: {params.roomId}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live consultation</CardTitle>
          </CardHeader>
          <CardContent>
            <MeetingRoom
              roomId={params.roomId}
              userId={session.userId}
              userName={userName}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
