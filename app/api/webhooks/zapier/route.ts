import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Validate the request
    // In a real implementation, you would verify the API key

    console.log("Received Zapier webhook:", payload)

    // Process the webhook payload
    // This could create tasks, update projects, etc.

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Zapier webhook:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}

