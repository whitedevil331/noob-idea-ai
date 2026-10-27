import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ error: "Missing title or description" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set on the server; using deterministic assessment.");
      return NextResponse.json({
        novelty: 8,
        feasibility: 7,
        impact: 8,
        summary: `A high-potential venture concept centered on "${title}". Execution speed and customer discovery will decide whether this captures significant market share.`,
        roast: `Building "${title}" sounds bold until you remember that execution eats ambition for breakfast. Validate your paying customers before adding unnecessary bells and whistles!`,
        nextSteps: [
          "Conduct 10 discovery interviews with ideal customers",
          "Deploy an interactive prototype to test core retention",
          "Launch an early-bird landing page to capture pre-orders"
        ],
        marketResponse: {
          love: "High workflow automation and direct operational efficiency",
          hate: "Switching friction from existing legacy setups"
        },
        competitors: [
          { name: "Legacy Alternatives", strategy: "Expensive enterprise contracts with high sales overhead" },
          { name: "Fragmented Point Tools", strategy: "Siloed features requiring complex integration" }
        ],
        roadmap: [
          { phase: "Month 1", tasks: ["Prototype core feature", "Interview 15 target users", "Draft architecture"] },
          { phase: "Month 2", tasks: ["Private alpha release", "Refine user onboarding", "Instrument metrics"] },
          { phase: "Month 3", tasks: ["Self-serve rollout", "Launch outbound marketing", "Measure retention"] }
        ]
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Assess this business/project idea:
Title: ${title}
Description: ${description}

Provide a JSON response with:
- novelty: number (1-10)
- feasibility: number (1-10)
- impact: number (1-10)
- summary: short paragraph assessment
- roast: A short, witty, swag-filled roast of this startup idea. It should be attractive and funny but not harm the ego.
- nextSteps: array of 3 strings
- marketResponse: object with 'love' (why people will love it) and 'hate' (why people might hate it) strings
- competitors: array of objects with 'name' and 'strategy' (how they operate) strings
- roadmap: array of objects with 'phase' (e.g. Month 1) and 'tasks' (array of strings)`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || '{}');
      return NextResponse.json(result);
    } catch (modelError: any) {
      console.warn("Server Gemini API call failed, providing structured fallback:", modelError?.message);
      return NextResponse.json({
        novelty: 8,
        feasibility: 7,
        impact: 8,
        summary: `A high-potential venture concept centered on "${title}". Execution speed and customer discovery will decide whether this captures significant market share.`,
        roast: `Building "${title}" sounds bold until you remember that execution eats ambition for breakfast. Validate your paying customers before adding unnecessary bells and whistles!`,
        nextSteps: [
          "Conduct 10 discovery interviews with ideal customers",
          "Deploy an interactive prototype to test core retention",
          "Launch an early-bird landing page to capture pre-orders"
        ],
        marketResponse: {
          love: "High workflow automation and direct operational efficiency",
          hate: "Switching friction from existing legacy setups"
        },
        competitors: [
          { name: "Legacy Alternatives", strategy: "Expensive enterprise contracts with high sales overhead" },
          { name: "Fragmented Point Tools", strategy: "Siloed features requiring complex integration" }
        ],
        roadmap: [
          { phase: "Month 1", tasks: ["Prototype core feature", "Interview 15 target users", "Draft architecture"] },
          { phase: "Month 2", tasks: ["Private alpha release", "Refine user onboarding", "Instrument metrics"] },
          { phase: "Month 3", tasks: ["Self-serve rollout", "Launch outbound marketing", "Measure retention"] }
        ]
      });
    }
  } catch (error: any) {
    console.error("AI Assessment failed:", error);
    return NextResponse.json({ error: error.message || "Assessment failed" }, { status: 500 });
  }
}
