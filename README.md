# SahayaVoice
# Project Context: SahayaVoice (Bengaluru Bobathon - Voice AI Track)

## 1. Project Overview
We are building *SahayaVoice*, a real-time, multilingual, dialect-aware Voice AI assistant designed for Bengaluru. It bridges the language and bureaucracy gap for migrant workers, gig-economy delivery partners, and senior citizens who struggle to navigate local civic services (BESCOM, BWSSB, BBMP), rental disputes, or everyday administrative tasks due to language barriers (Kannada vs. Hindi, Tamil, Telugu, and English/Kanglish).

## 2. Core Problem & User Persona
- *Primary Users:* 
  1. Migrant workers/professionals in Bengaluru who speak Hindi, Tamil, Telugu, or English and need to file formal complaints or understand official notices written in Kannada.
  2. Local senior citizens who prefer speaking colloquial Kannada rather than navigating complex English government portals.
- *Core Pain Point:* Filing a simple civic complaint (e.g., BESCOM power fluctuation, BWSSB water issue, BBMP khata/garbage issue) or understanding a rental clause requires formal Kannada literacy and knowledge of bureaucratic formats.

## 3. MVP User Flow (What We Are Building Today)
1. *Voice Input:* User speaks naturally via the browser microphone in their preferred language (Hindi, English, Tamil, Telugu, or colloquial Kannada/Kanglish).
2. *Speech-to-Text (STT) & Intent Extraction:* The system transcribes the audio, detects the language, and identifies the civic/legal intent (e.g., BESCOM Meter Issue, Rental Deposit Query, BBMP Grievance).
3. *Conversational Clarification (Voice Loop):* If key details are missing (e.g., Ward/Area like Indiranagar/Whitefield, Account ID, or issue specifics), SahayaVoice asks follow-up questions in the *user's spoken language* via Text-to-Speech (TTS).
4. *Action & Artifact Generation:* Once details are gathered, the system:
   - Generates a *formal, grammatically accurate Kannada petition/complaint letter* ready for submission.
   - Displays a translated summary in the user's native language so they can verify what is written.
   - Plays an audio confirmation summarizing the next steps.

## 4. Technical Architecture & Suggested Stack
- *Frontend:* Next.js / React (or Streamlit/Gradio for rapid prototyping) with Web Audio API for microphone capture and audio playback.
- *Backend:* Python (FastAPI) or Node.js handling audio streams and LLM orchestration.
- *Voice & Language Pipeline:*
  - *STT (Speech-to-Text):* OpenAI Whisper (whisper-large-v3) or Sarvam AI (saarika) / Bhashini APIs for Indian languages & code-mixing.
  - *LLM Reasoning & Translation:* IBM Granite / Watsonx.ai (or GPT-4o / Llama-3) with strict system prompts for formal Kannada administrative drafting and empathetic conversational follow-ups.
  - *TTS (Text-to-Speech):* Sarvam AI (bulbul), Edge-TTS, or ElevenLabs supporting natural Indian accents (Kannada, Hindi, Indian English).

## 5. UI/UX Requirements for the Hackathon Demo
- Clean, mobile-first interface with a prominent *"Tap to Speak"* pulse button.
- Live waveform animation during recording and playback.
- *Split-View Output Card:* 
  - Left/Top: User's spoken transcript & AI's conversational response.
  - Right/Bottom: The auto-generated *Official Kannada Document* (with a "Copy Text" and "Download PDF" button) + English/Hindi verification summary.
- Include 2-3 one-click *"Demo Scenario Presets"* (e.g., "BESCOM Power Issue in Whitefield", "Landlord Deposit Dispute in Koramangala") for backup during live judging.


## 6. Instructions for IBM Bob
Act as our lead full-stack and Voice AI architect. Help us scaffold the repository, write clean modular code for the audio recording -> STT -> LLM -> TTS pipeline, and ensure low-latency responses. Always prioritize reliability and quick hackathon-ready implementation over complex over-engineering.
Use code with caution.
