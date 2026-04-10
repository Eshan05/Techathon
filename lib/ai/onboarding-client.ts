import { toast } from "sonner"

export interface OnboardingStep {
  step: 1 | 2 | 3 | 4
  title: string
  description: string
}

export const ONBOARDING_STEPS: Record<number, OnboardingStep> = {
  1: {
    step: 1,
    title: "Verify Your Identity",
    description: "Upload your official government-issued ID",
  },
  2: {
    step: 2,
    title: "Verify Land Ownership",
    description: "Verify your land records using the official portal",
  },
  3: {
    step: 3,
    title: "Face Verification",
    description: "Complete a quick face scan for secure verification",
  },
  4: {
    step: 4,
    title: "Verification Complete",
    description: "Review your verification status",
  },
}

export async function uploadIdentityDocument(
  documentType: string,
  file: File
): Promise<{ url: string; key: string } | null> {
  const formData = new FormData()
  formData.append("documentType", documentType)
  formData.append("file", file)

  try {
    const response = await fetch("/api/onboarding/identity", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.message || "Failed to upload identity document")
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Identity upload error:", error)
    toast.error("Network error while uploading document")
    return null
  }
}

export async function submitLandVerification(
  file?: File
): Promise<{ success: boolean } | null> {
  const formData = new FormData()
  if (file) {
    formData.append("file", file)
  }

  try {
    const response = await fetch("/api/onboarding/land", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.message || "Failed to verify land record")
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Land verification error:", error)
    toast.error("Network error during land verification")
    return null
  }
}

export async function submitFaceVerification(
  faceData: string
): Promise<{ success: boolean } | null> {
  try {
    const response = await fetch("/api/onboarding/face", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ faceData }),
    })

    if (!response.ok) {
      const error = await response.json()
      toast.error(error.message || "Failed to verify face")
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Face verification error:", error)
    toast.error("Network error during face verification")
    return null
  }
}

export async function getOnboardingStatus(): Promise<{
  currentStep: number
  overallStatus: string
  identityStatus: string
  landStatus: string
  faceStatus: string
} | null> {
  try {
    const response = await fetch("/api/onboarding/status")

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Get onboarding status error:", error)
    return null
  }
}
