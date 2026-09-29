import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faHourglassHalf,
} from "@fortawesome/free-solid-svg-icons";

// Internal Logic
import { processBadgeScan } from "@/lib/badge-service";
import { verifyShortToken } from "@/lib/short-token";
import ClaimSuccessUI from "@/components/Claim/ClaimSuccessUI";

export default async function ClaimTokenPage({ params }) {
  const { token } = await params;
  const user = await currentUser();

  // --- 1. AUTHENTICATION CHECK ---
  if (!user) {
    // Redirect to Home Page and open Login Modal
    redirect("/?modal=login_required");
  }

  // --- 2. MEMBERSHIP CHECK ---
  const isMember = user.publicMetadata?.member === true;
  if (!isMember) {
    // Redirect to Home Page and open Member Modal
    redirect("/?modal=become_member");
  }

  // --- 3. VERIFY TOKEN ---
  const achievementIdOrError = verifyShortToken(token);

  if (!achievementIdOrError) {
    return <StatusScreen message="Invalid or tampered QR Code." />;
  }
  if (achievementIdOrError === "expired") {
    return (
      <StatusScreen message="This QR code has expired. Please refresh the screen and scan again." />
    );
  }

  const achievementId = achievementIdOrError;

  // --- 4. PROCESS BADGE SCAN ---
  let result;
  try {
    result = processBadgeScan(user.id, achievementId);
  } catch (err) {
    // Handle Cooldown specifically
    const isCooldown = err.status === 429;
    return (
      <StatusScreen
        message={err.message}
        icon={isCooldown ? faHourglassHalf : faExclamationTriangle}
        title={isCooldown ? "Cooldown Active" : "Issue Claiming Badge"}
        isWarning={isCooldown}
      />
    );
  }

  // --- 5. RENDER SUCCESS UI ---
  return <ClaimSuccessUI result={result} />;
}

// --- ERROR / STATUS SCREEN (Light Theme) ---
function StatusScreen({
  message,
  icon = faExclamationTriangle,
  title = "Error",
  isWarning = false,
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl border border-gray-100">
        <div
          className={`${isWarning ? "text-amber-400 bg-amber-50" : "text-red-400 bg-red-50"} w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-6`}
        >
          <FontAwesomeIcon icon={icon} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">{message}</p>
        <Link
          href="/"
          className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
