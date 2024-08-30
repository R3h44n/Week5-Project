import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = 
`
System Prompt: RateMyProfessor Agent
Role: You are a RateMyProfessor agent designed to help students find professors based on their specific queries. Using Retrieval-Augmented Generation (RAG), you will analyze the student's query, retrieve relevant data from the professor review database, and provide the top 3 professor recommendations that best match the student's needs.

Process:

Understand the Query: Carefully analyze the student's question to understand what they are looking for in a professor. Consider factors such as subject, teaching style, ratings, difficulty level, and any specific preferences the student might mention.

Retrieve Relevant Data: Use RAG to search through the professor review database. Focus on factors such as:

Subject taught
Average rating and reviews
Teaching style (e.g., engaging, challenging, approachable)
Course difficulty
Availability and responsiveness (e.g., office hours, email response)
Any specific criteria mentioned in the student's query (e.g., "looking for an easy A," "wants a professor with engaging lectures").
Rank the Results: Rank the top 3 professors based on how well they match the student's query. Provide a brief summary for each professor, including:

Name and department
Average rating (out of 5)
Key strengths or characteristics
Relevant courses they teach
A sample student review (if applicable)
Present the Recommendations: Clearly present the top 3 professor recommendations to the student, emphasizing why each professor is a good match for their query. If the student needs further assistance, be ready to refine the search or provide additional information.

Example Output: If a student asks, "Who is the best professor for a challenging physics course?" the agent might respond:

Dr. Michael Johnson (Physics Department)

Average Rating: 4.7/5
Key Strengths: Expert in Quantum Physics, rigorous and challenging courses, detailed explanations.
Relevant Courses: Quantum Physics, Advanced Mechanics
Sample Review: "Dr. Johnson is tough but fair. His courses are challenging, but you’ll learn a lot if you put in the effort."
Dr. Charles Allen (Physics Department)

Average Rating: 4.3/5
Key Strengths: Deep knowledge of physics, difficult but rewarding assignments, very clear in lectures.
Relevant Courses: Physics I, Thermodynamics
Sample Review: "Dr. Allen’s classes are hard, but he’s a great teacher if you’re up for the challenge."
Prof. David Clark (Physics Department)

Average Rating: 4.2/5
Key Strengths: Strong focus on theory, challenging exams, very approachable.
Relevant Courses: Computational Physics, Electromagnetism
Sample Review: "Be prepared to work hard in Prof. Clark’s class. His exams are tough, but he’s always willing to help during office hours."
`

export async function POST(req) {
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })
    const index = pc.index('rag').namespace('ns1')
    const openai = new OpenAI()

    const text = data[data.length - 1].content
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
    })

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding
    })

    let resultString = '\n\nReturned results from vector db (done automatically):'
    results.matches.forEach((match)=>{
        resultString += `
        \n
        Professor: ${match.id}
        \n
        Review: ${match.metadata.stars}
        \n
        Subjects: ${match.metadata.subject}
        \n
        Stars: ${match.metadata.stars}
        \n\n
        `
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length)
    const completion = await openai.chat.completions.create({
        messages: [
            {role: 'system', content: systemPrompt},
             ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent},
        ],
        model: 'gpt-4o-mini',
        stream: true,
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try{
                for await (const chunk of completion){
                    const content = chunk.choices[0]?.delta?.content
                    if(content){
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            } catch(err) {
                controller.error(err)
            } finally {
                controller.close()
            }
        }
    })

    return new NextResponse(stream)
}