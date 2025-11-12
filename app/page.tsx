"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send,
  ChefHat,
  DollarSign,
  Clock,
  Refrigerator,
  Package,
  Recycle,
  AlertTriangle,
  Plus,
  History,
  X,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface SavedChat {
  id: string
  title: string
  timestamp: Date
  messages: Message[]
  userBudget: string
  batchCooking: boolean
  equipment: string
}

const STORAGE_TIPS: any[] = [
  { food: "Cooked Rice", container: "Airtight container", duration: "3-4 days", safety: "safe" },
  { food: "Pasta", container: "Glass container", duration: "3-5 days", safety: "safe" },
  { food: "Curry/Stew", container: "Sealed container", duration: "3-4 days", safety: "safe" },
  { food: "Cooked Vegetables", container: "Breathable container", duration: "2-3 days", safety: "caution" },
  { food: "Meat dishes", container: "Airtight container", duration: "2-3 days", safety: "caution" },
]

const LEFTOVER_TRANSFORMATIONS: any[] = [
  { base: "Rice", transforms: ["Fried Rice", "Rice Pudding", "Stuffed Peppers"] },
  { base: "Pasta", transforms: ["Pasta Salad", "Baked Pasta", "Soup Base"] },
  { base: "Curry", transforms: ["Wraps", "Pizza Topping", "Sandwich Filling"] },
  { base: "Vegetables", transforms: ["Smoothie", "Omelet Filling", "Soup"] },
]

export default function StudyChefChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hey student! I'm StudyChef, your budget-friendly cooking buddy! Let's create amazing meals that won't break the bank! Are you vegetarian or non-vegetarian?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userBudget, setUserBudget] = useState<string>("")
  const [batchCooking, setBatchCooking] = useState<boolean>(false)
  const [equipment, setEquipment] = useState<string>("")
  // Added state for showing storage tips and leftover suggestions
  const [showStorageTips, setShowStorageTips] = useState<boolean>(false)
  const [showLeftoverTips, setShowLeftoverTips] = useState<boolean>(false)
  const [savedChats, setSavedChats] = useState<SavedChat[]>([])
  const [showChatHistory, setShowChatHistory] = useState<boolean>(false)
  const [currentChatId, setCurrentChatId] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem("studychef-chats")
    if (saved) {
      try {
        const parsedChats = JSON.parse(saved).map((chat: any) => ({
          ...chat,
          timestamp: new Date(chat.timestamp),
        }))
        setSavedChats(parsedChats)
      } catch (error) {
        console.error("Error loading saved chats:", error)
      }
    }
  }, [])

  const saveCurrentChat = () => {
    if (messages.length <= 1) return // Don't save if only initial message

    const chatTitle = messages.find((m) => m.role === "user")?.content.slice(0, 30) + "..." || "New Chat"
    const newChat: SavedChat = {
      id: currentChatId || Date.now().toString(),
      title: chatTitle,
      timestamp: new Date(),
      messages,
      userBudget,
      batchCooking,
      equipment,
    }

    const updatedChats = savedChats.filter((chat) => chat.id !== newChat.id)
    updatedChats.unshift(newChat)

    // Keep only last 10 chats
    const limitedChats = updatedChats.slice(0, 10)

    setSavedChats(limitedChats)
    localStorage.setItem("studychef-chats", JSON.stringify(limitedChats))
    setCurrentChatId(newChat.id)
  }

  const startNewChat = () => {
    // Save current chat before starting new one
    saveCurrentChat()

    // Reset all state
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hey student! I'm StudyChef, your budget-friendly cooking buddy! Let's create amazing meals that won't break the bank! Are you vegetarian or non-vegetarian?",
      },
    ])
    setInput("")
    setUserBudget("")
    setBatchCooking(false)
    setEquipment("")
    setShowStorageTips(false)
    setShowLeftoverTips(false)
    setCurrentChatId("")
    setShowChatHistory(false)
  }

  const loadSavedChat = (chat: SavedChat) => {
    // Save current chat before loading another
    saveCurrentChat()

    setMessages(chat.messages)
    setUserBudget(chat.userBudget)
    setBatchCooking(chat.batchCooking)
    setEquipment(chat.equipment)
    setCurrentChatId(chat.id)
    setShowChatHistory(false)
  }

  const deleteSavedChat = (chatId: string) => {
    const updatedChats = savedChats.filter((chat) => chat.id !== chatId)
    setSavedChats(updatedChats)
    localStorage.setItem("studychef-chats", JSON.stringify(updatedChats))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (messages.length > 1) {
      const timeoutId = setTimeout(() => {
        saveCurrentChat()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId)
    }
  }, [messages, userBudget, batchCooking, equipment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    const userMessageCount = messages.filter((m) => m.role === "user").length
    if (userMessageCount === 1 && input.includes("$")) {
      setUserBudget(input)
    }
    if (userMessageCount === 2 && input.toLowerCase().includes("kitchen")) {
      setEquipment(input)
    }
    if (input.toLowerCase().includes("batch") || input.toLowerCase().includes("yes")) {
      setBatchCooking(true)
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      }

      setMessages((prev) => [...prev, assistantMessage])

      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const data = JSON.parse(line.slice(2))
                if (data.content) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id ? { ...msg, content: msg.content + data.content } : msg,
                    ),
                  )
                }
              } catch (e) {
                // Ignore parsing errors for streaming data
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment!",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleQuickResponse = (response: string) => {
    // Added logic to show storage/leftover tips based on response
    if (response === "Storage tips") {
      setShowStorageTips(true)
      return
    }
    if (response === "Transform leftovers") {
      setShowLeftoverTips(true)
      return
    }

    setInput(response)
    setTimeout(() => {
      const form = document.querySelector("form")
      if (form) {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
      }
    }, 100)
  }

  const getQuickResponses = () => {
    const userMessageCount = messages.filter((m) => m.role === "user").length
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || ""

    if (userMessageCount === 0) {
      return ["Vegetarian", "Non-vegetarian"]
    }

    if (userMessageCount === 1) {
      return ["Ultra-tight ($2/day)", "Budget ($3-5/day)", "Comfortable ($5+/day)"]
    }

    if (userMessageCount === 2) {
      return ["Microwave only", "Single burner", "Basic kitchen", "Full kitchen"]
    }

    if (userMessageCount === 3) {
      return ["No allergies", "Gluten-free", "Nut allergy", "Dairy-free"]
    }

    if (userMessageCount === 4) {
      return ["Beginner", "Comfortable", "Advanced"]
    }

    if (userMessageCount === 5) {
      return ["Yes, batch cooking!", "No, fresh daily"]
    }

    if (userMessageCount === 6) {
      return ["Tiny fridge", "Shared fridge", "Normal fridge"]
    }

    if (userMessageCount >= 7 && (lastMessage.includes("meal plan") || lastMessage.includes("recipe"))) {
      return ["Love it!", "Transform leftovers", "Shopping list", "Storage tips"]
    }

    return []
  }

  const quickResponses = getQuickResponses()

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50">
      <div className="bg-gradient-to-r from-yellow-600 to-pink-500 px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
            <ChefHat className="w-7 h-7 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h1 className="font-serif font-bold text-2xl text-white">StudyChef</h1>
            <p className="text-sm text-yellow-100">Budget-friendly cooking for students!</p>
          </div>
          <div className="flex gap-2">
            {userBudget && (
              <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-white" />
                <span className="text-xs text-white font-medium">{userBudget.split(" ")[0]}</span>
              </div>
            )}
            {batchCooking && (
              <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1">
                <Clock className="w-4 h-4 text-white" />
                <span className="text-xs text-white font-medium">Batch</span>
              </div>
            )}
            {equipment && (
              <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1 flex items-center gap-1">
                <Refrigerator className="w-4 h-4 text-white" />
                <span className="text-xs text-white font-medium">{equipment.split(" ")[0]}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="text-white hover:bg-white/20 rounded-full p-2"
              title="Chat History"
            >
              <History className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewChat}
              className="text-white hover:bg-white/20 rounded-full p-2"
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {showChatHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex">
          <div className="bg-white w-80 h-full shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-serif font-bold text-lg text-gray-800">Chat History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChatHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4">
              {savedChats.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No saved chats yet</p>
              ) : (
                <div className="space-y-3">
                  {savedChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        currentChatId === chat.id ? "border-yellow-300 bg-yellow-50" : "border-gray-200"
                      }`}
                      onClick={() => loadSavedChat(chat)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-gray-800 truncate">{chat.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {chat.timestamp.toLocaleDateString()} at{" "}
                            {chat.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{chat.messages.length} messages</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSavedChat(chat.id)
                          }}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowChatHistory(false)} />
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 pb-24">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-yellow-500 to-pink-500 text-white rounded-br-md shadow-md"
                    : "bg-white text-gray-800 rounded-bl-md shadow-md border-2 border-yellow-200"
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                <div className={`text-xs mt-2 ${message.role === "user" ? "text-yellow-100" : "text-gray-500"}`}>
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-md border-2 border-yellow-200">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Added Storage Tips Panel */}
        {showStorageTips && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg border-2 border-yellow-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-yellow-600" />
              <h3 className="font-serif font-bold text-lg text-gray-800">Smart Storage Guide</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStorageTips(false)}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                ×
              </Button>
            </div>
            <div className="grid gap-3">
              {STORAGE_TIPS.map((tip, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      tip.safety === "safe" ? "bg-green-400" : tip.safety === "caution" ? "bg-yellow-400" : "bg-red-400"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-800">{tip.food}</div>
                    <div className="text-xs text-gray-600">
                      {tip.container} • {tip.duration}
                    </div>
                  </div>
                  {tip.safety === "caution" && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800 font-medium">Pro Tip: Fridge Tetris!</div>
              <div className="text-xs text-blue-600 mt-1">
                Store heavy items at bottom, use clear containers, and label everything with dates!
              </div>
            </div>
          </div>
        )}

        {/* Added Leftover Transformation Panel */}
        {showLeftoverTips && (
          <div className="mt-6 bg-white rounded-2xl shadow-lg border-2 border-pink-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Recycle className="w-5 h-5 text-pink-600" />
              <h3 className="font-serif font-bold text-lg text-gray-800">Leftover Magic</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLeftoverTips(false)}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                ×
              </Button>
            </div>
            <div className="grid gap-4">
              {LEFTOVER_TRANSFORMATIONS.map((item, index) => (
                <div key={index} className="p-3 bg-pink-50 rounded-lg">
                  <div className="font-medium text-sm text-gray-800 mb-2">{item.base} → Transform into:</div>
                  <div className="flex flex-wrap gap-2">
                    {item.transforms.map((transform, i) => (
                      <span key={i} className="px-2 py-1 bg-pink-200 text-pink-800 text-xs rounded-full">
                        {transform}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-green-800 font-medium">Rescue Recipe Alert!</div>
              <div className="text-xs text-green-600 mt-1">
                Got ingredients about to expire? Mix them into a stir-fry, soup, or omelet!
              </div>
            </div>
          </div>
        )}

        {quickResponses.length > 0 && !isLoading && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-3 font-medium">Quick responses:</p>
            <div className="flex flex-wrap gap-2">
              {quickResponses.map((response) => (
                <Button
                  key={response}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickResponse(response)}
                  className="border-2 border-yellow-300 text-yellow-700 hover:bg-gradient-to-r hover:from-yellow-100 hover:to-pink-100 hover:border-yellow-400 rounded-full font-medium shadow-sm hover:shadow-md transition-all"
                >
                  {response}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-600 to-pink-500 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 border-2 border-yellow-200 focus:border-white focus:ring-white rounded-full px-4 bg-white/95 backdrop-blur"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-white text-yellow-600 hover:bg-yellow-50 rounded-full w-12 h-12 flex-shrink-0 shadow-md hover:shadow-lg transition-all"
              disabled={isLoading}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
