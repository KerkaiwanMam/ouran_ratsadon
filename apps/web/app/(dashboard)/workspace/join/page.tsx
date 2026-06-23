"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type State = "loading" | "success" | "error";

export default function WorkspaceJoinPage() {
  // useSearchParams() requires a Suspense boundary for static prerendering
  return (
    <Suspense fallback={null}>
      <WorkspaceJoinContent />
    </Suspense>
  );
}

function WorkspaceJoinContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("ลิงก์เชิญไม่ถูกต้อง");
      return;
    }

    fetch("/api/workspace/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setState("error");
          setMessage(json.message ?? "ไม่สามารถเข้าร่วม Workspace ได้");
        } else {
          setState("success");
          setWorkspaceName(json.workspaceName ?? "");
          // Redirect after 3s
          setTimeout(() => router.push("/workspace"), 3000);
        }
      })
      .catch(() => {
        setState("error");
        setMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-10 max-w-sm w-full text-center">
        {state === "loading" && (
          <>
            <Loader2 className="animate-spin mx-auto mb-4 text-[#7F77DD]" size={40} />
            <p className="text-gray-600 dark:text-gray-400">กำลังตรวจสอบการเชิญ…</p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 text-green-500" size={48} />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              เข้าร่วมสำเร็จ!
            </h1>
            {workspaceName && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                คุณได้เข้าร่วม <strong className="text-gray-900 dark:text-gray-100">{workspaceName}</strong> แล้ว
              </p>
            )}
            <p className="text-sm text-gray-400">กำลังพาคุณไปยัง Workspace…</p>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="mx-auto mb-4 text-red-500" size={48} />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              เกิดข้อผิดพลาด
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <button
              onClick={() => router.push("/workspace")}
              className="w-full py-2 px-4 rounded-lg bg-[#7F77DD] text-white font-medium hover:bg-[#6B63CC] transition-colors"
            >
              ไปที่ Workspace
            </button>
          </>
        )}
      </div>
    </div>
  );
}
