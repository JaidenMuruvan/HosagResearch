# Friendbot

Friendbot is an interactive web-based prototype exploring how generative AI chatbots can create a sense of familiarity, trust and emotional connection through conversation.

The project was developed as part of “Holding Our Space in the Age of GAI” and examines how interaction design choices can influence the way people experience conversational AI. It also explores the ethical responsibilities involved in designing systems that may feel socially meaningful to users.

## Project Overview

Friendbot uses a conversational interface alongside a relationship timeline and connection percentage. During a conversation, the application tracks six behaviours:

Memory: Referring to information shared earlier in the conversation.

Similarity Matching: Highlighting similarities between the user and the chatbot.

Emotional Validation: Acknowledging and responding to the user's feelings.

Continuity: Following up on earlier topics or maintaining a conversational thread.

Trust Through Candour: Acknowledging uncertainty, correcting mistakes and allowing for gentle disagreement.

Care: Responding in a considerate and supportive manner.

These behaviours contribute to a visual progression through five stages: Introduction, Familiarity, Affiliation, Trust and Attachment.

The connection percentage and stages are design indicators used to make the prototype's mechanisms visible. They are not a validated measurement of real emotional attachment.

Friendbot also includes a reveal screen that explains the behaviours being tracked, the limitations of the scoring system and questions for personal reflection.

## Technologies Used

- React
- Vite
- JavaScript
- Google Gemini API
- CSS

## Requirements

Before running the project, you will need:

- Node.js and npm
- Git, if cloning the repository
- A Google Gemini API from [Google AI Studio](https://aistudio.google.com/api-keys)

## Installation

## 1. Clone the repository

Open a terminal and run: git clone https://github.com/JaidenMuruvan/HosagResearch.git

Navigate into the project folder: cd HosagResearch

## Install dependencies

Run: npm install

## Configure environment variables

The API credentials are not included in the GitHub repository because local environment files are excluded from version control.

Create a file named .env.local in the project root, alongside package.json.

Add the following variables:

VITE_API_URL= your_api_url
VITE_GEMINI_API_KEY=your_gemini_api_key

Replace the placeholder values with the appropriate configuration for the project.

The API URL must match the endpoint expected by the application. If you are unsure which URL to use, check the project's API request code or ask the project developer.

Important: Do not commit .env.local or share your API key publicly.

The .env.example file included in the repository, provides a template showing which environment variables are required. It does not contain working credentials.

## 4. Start the development server

Run: npm run dev

## How to Use Friendbot

1. Open the application in your browser.

2. Start a conversation with the chatbot.

3. Observe how the chatbot responds and which conversational behaviours appear.

4. Follow the relationship timeline and connection percentage as they change.

5. Open the reveal screen to explore the tracked behaviours, scoring limitations and reflection questions.

The reveal screen is intended to encourage critical reflection on how the interaction is designed, rather than to present the connection score as a psychological assessment.

## Development Notes

The project uses environment variables for API configuration. Before running it, ensure that the required variables are present in .env.local.

If the chatbot reports a missing environment variable, check that:

- .env.local exists in the project root.
- The variable names match those used in the application.
- The values are correct.
- The development server was restarted after the file was created or edited.
