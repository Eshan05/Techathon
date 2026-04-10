import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { SarvamAIClient } from "sarvamai"

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
})

type TranslateTargetLanguage = NonNullable<
  Parameters<typeof client.text.translate>[0]["target_language_code"]
>

const ALLOWED_TARGET_LANGUAGES: readonly TranslateTargetLanguage[] = [
  "hi-IN",
  "mr-IN",
  "gu-IN",
  "ta-IN",
  "te-IN",
  "kn-IN",
  "bn-IN",
  "pa-IN",
]

function resolveTargetLanguage(input: string): TranslateTargetLanguage {
  return ALLOWED_TARGET_LANGUAGES.includes(input as TranslateTargetLanguage)
    ? (input as TranslateTargetLanguage)
    : "hi-IN"
}

export const maxDuration = 60 // Allow 60 seconds

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const targetLanguageValue = formData.get("language")

    if (!file || typeof targetLanguageValue !== "string") {
      return NextResponse.json(
        { error: "Missing file or target language" },
        { status: 400 }
      )
    }

    const targetLanguage = resolveTargetLanguage(targetLanguageValue)

    // Convert file to base64
    const buffer = await file.arrayBuffer()
    const base64String = Buffer.from(buffer).toString("base64")

    const prompt = `Please read the attached document carefully and extract all the text. Ignore formatting, just give me the raw plain text strictly in its original language. Do not translate it.`

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64String,
                mimeType: file.type,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        temperature: 0.1,
      },
    })

    const extractedText = response.text || ""

    if (!extractedText.trim()) {
      throw new Error("Could not extract any text from the document.")
    }

    const translationResponse = await client.text.translate({
      input: extractedText,
      source_language_code: "auto",
      target_language_code: targetLanguage,
      speaker_gender: "Male",
    })

    const translatedText = translationResponse.translated_text

    return NextResponse.json({ text: translatedText })
  } catch (error: any) {
    console.error("Translation error:", error)
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    )
  }
}
