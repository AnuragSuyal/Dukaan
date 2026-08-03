import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DemoConfirmationPage() {
  const signal = await prisma.demandSignal.findFirst({
    where: {
      status: {
        in: ["SENT", "NO_RESPONSE", "DRAFT"],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      confirmationToken: true,
    },
  });

  if (!signal) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="rounded-3xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-black">
            No pending signal available
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Seed or generate a pending demand signal first.
          </p>
        </div>
      </main>
    );
  }

  redirect(`/confirm/${signal.confirmationToken}`);
}