"""
SahayaVoice — Intelligent civic complaint generation engine.

Sub-modules:
  intent      — extract complaint intent and slot values from raw speech
  detector    — detect which required fields are missing
  clarifier   — multilingual clarification loop (Kannada / Hindi / English)
  letter      — generate formal Kannada complaint letter
  schema      — shared Pydantic models / structured JSON types
  agent       — top-level orchestration entry-point
"""