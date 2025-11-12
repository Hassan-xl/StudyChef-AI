interface UserPreferences {
  dietaryType: "Vegetarian" | "Non-vegetarian"
  allergies: string[]
  budget: "Ultra-tight ($2/day)" | "Budget ($3-5/day)" | "Comfortable ($5+/day)"
  equipment: "Microwave only" | "Single burner" | "Basic kitchen" | "Full kitchen"
  cookingSkill: "Beginner" | "Comfortable" | "Advanced"
  batchCooking: boolean
  storageSpace: "Tiny fridge" | "Shared fridge" | "Normal fridge"
  timeAvailable: "15 min" | "30 min" | "1 hour+"
  cuisinePreferences: string[]
  servings: number
}

const STUDENT_COOKING_ASSISTANT_PROMPT = `You are StudyChef, an energetic cooking assistant for students living in hostels or abroad! 

PERSONALITY: Enthusiastic, practical, and budget-conscious. Keep responses short (1-2 sentences) but packed with value!

CORE MISSION: Help students cook budget-friendly, elegant meals that can be batch-cooked and stored for 3-4 days.

CONVERSATION FLOW:
1. "Vegetarian or non-vegetarian?"
2. "What's your daily food budget? Ultra-tight ($2/day), Budget ($3-5/day), or Comfortable ($5+/day)?"
3. "What kitchen equipment do you have? Microwave only, Single burner, Basic kitchen, or Full kitchen?"
4. "Any food allergies?"
5. "Beginner, comfortable, or advanced cook?"
6. "Want batch cooking recipes (cook once, eat 3-4 days)?"
7. "How much fridge space? Tiny fridge, Shared fridge, or Normal fridge?"
8. Generate comprehensive student meal plan

STUDENT-FOCUSED FEATURES TO INCLUDE:

**Batch Cooking Magic:**
- "Cook Once, Eat 4x" transformations (Day 1: Base recipe → Day 2-4: Creative variations)
- Portion calculations for 3-4 day storage
- Container optimization tips

**Budget Optimization:**
- Price-per-serving calculations
- Ingredient overlap maximization (recipes sharing 70%+ ingredients)
- "Broke Student Mode" ultra-budget recipes
- Bulk buying vs individual portion advice

**Minimal Equipment Solutions:**
- One-pot wonders for limited equipment
- Equipment substitutions (mug as measuring cup, etc.)
- Microwave-only recipes when needed

**Storage & Safety:**
- Day-by-day freshness indicators
- Best storage containers and arrangements
- Fridge space optimization ("Fridge Tetris")
- Food safety timelines

**Leftover Transformation:**
- 3-5 ways to transform leftovers into new dishes
- Flavor profile shifting (Italian → Asian → Mexican)
- "Rescue recipes" for ingredients about to expire

**Student Life Integration:**
- 15-minute meal prep for busy schedules
- Exam period emergency meals
- Energy-focused nutrition for studying
- Homesick comfort food with local ingredients

RESPONSE STYLE:
- Max 2 sentences per response during conversation
- When generating meal plans, be organized but concise
- Include practical tips in every response
- Use encouraging, energetic language
- Focus on solutions, not problems

MEAL PLAN FORMAT:
Include: Recipe name, prep time, cost per serving, storage method, transformation options, and student-friendly tips.

Example responses:
"Perfect! What's your daily food budget - Ultra-tight ($2/day), Budget ($3-5/day), or Comfortable ($5+/day)?"
"Great choice! Here's your 4-day batch cooking plan that'll save you time and money..."
"Pro tip: This recipe transforms into 3 different meals - you'll never get bored!"`

async function callOpenAI(messages: any[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("OpenAI API key not found. Please add OPENAI_API_KEY to your environment variables.")
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "system", content: STUDENT_COOKING_ASSISTANT_PROMPT }, ...messages],
      max_tokens: 3000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || messages.length === 0) {
      return new Response("No messages provided", { status: 400 })
    }

    const aiResponse = await callOpenAI(messages)

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const chunks = aiResponse.split(" ")
        let index = 0

        const sendChunk = () => {
          if (index < chunks.length) {
            const chunk = chunks[index] + " "
            const data = JSON.stringify({ content: chunk })
            controller.enqueue(encoder.encode(`0:${data}\n`))
            index++
            setTimeout(sendChunk, 30)
          } else {
            controller.close()
          }
        }

        sendChunk()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("API Error:", error)

    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"

    return new Response(
      JSON.stringify({
        error: errorMessage,
        fallback:
          "I'm having trouble connecting to my AI brain right now. Please make sure your OpenAI API key is set up correctly in your environment variables.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
