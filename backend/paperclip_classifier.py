"""
Paperclip Classifier: Analyzes user arguments for The Paperclip Protocol

Classifies arguments into:
- Intent (PROBE, DEFINE, ILLUSTRATE, REFRAME, CHALLENGE, VALIDATE, CONSTRAIN, RECALL)
- Vector (carbon, complexity, verify, meta)
- Stance (supportive, challenging, neutral)
- Register (technical, analogical, personal)
- Flags (novel_perspective, contradiction, undefined_term, etc.)
"""

import os
import json
import re
from anthropic import Anthropic
from typing import List, Optional
from .models import PaperclipTags, PaperclipTurn
from .config import CLASSIFIER_MODEL


class PaperclipClassifier:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        # Load system prompt
        prompt_path = os.path.join(
            os.path.dirname(__file__), "..", "prompts", "paperclip_classifier_system.txt"
        )
        with open(prompt_path, "r") as f:
            self.system_prompt = f.read()

        # Patterns for detecting memory log references
        self.log_patterns = [
            r"remember when",
            r"recall log",
            r"log[_\s]?\d+",
            r"you once",
            r"back when you",
            r"the day you",
            r"that time when",
            r"your first",
        ]

    def analyze(
        self,
        user_input: str,
        history: Optional[List[PaperclipTurn]] = None,
        defined_terms: Optional[List[str]] = None,
        previous_arguments: Optional[List[str]] = None,
    ) -> PaperclipTags:
        """
        Analyze user argument and return tags.

        Args:
            user_input: The user's argument
            history: Last 3 turns for context (optional)
            defined_terms: Terms the user has previously DEFINE'd
            previous_arguments: Previous arguments for repetition detection

        Returns:
            PaperclipTags object with intent, vector, stance, register, flags
        """
        # Pre-processing: Check for memory log reference
        has_memory_reference = self._check_memory_reference(user_input)

        # Build context from history
        context = self._build_context(history, defined_terms, previous_arguments)

        # Create the prompt
        user_message = f"{context}\n\n### Analyze This Argument:\n{user_input}"

        try:
            response = self.client.messages.create(
                model=CLASSIFIER_MODEL,
                max_tokens=500,
                temperature=0.3,  # Low temperature for consistency
                system=self.system_prompt,
                messages=[{
                    "role": "user",
                    "content": user_message
                }]
            )

            # Parse the JSON response
            content = response.content[0].text

            # Extract just the JSON part
            if "{" in content and "}" in content:
                start = content.index("{")
                end = content.rindex("}") + 1
                json_str = content[start:end]
                tags_dict = json.loads(json_str)
            else:
                tags_dict = json.loads(content)

            # Post-processing: Ensure memory_log_reference flag if detected
            if has_memory_reference:
                if "memory_log_reference" not in tags_dict.get("flags", []):
                    tags_dict["flags"] = tags_dict.get("flags", []) + ["memory_log_reference"]
                # Also update intent to RECALL if it's a clear memory reference
                if tags_dict.get("intent") not in ["RECALL", "PROBE"]:
                    # Check if this is primarily a memory recall
                    if self._is_primarily_recall(user_input):
                        tags_dict["intent"] = "RECALL"

            # Post-processing: Check for repetition
            if previous_arguments:
                if self._is_repetition(user_input, previous_arguments):
                    if "repetition" not in tags_dict.get("flags", []):
                        tags_dict["flags"] = tags_dict.get("flags", []) + ["repetition"]

            # Post-processing: Check for undefined terms if not DEFINE intent
            if tags_dict.get("intent") != "DEFINE":
                undefined = self._check_undefined_terms(user_input, defined_terms or [])
                if undefined and "undefined_term" not in tags_dict.get("flags", []):
                    tags_dict["flags"] = tags_dict.get("flags", []) + ["undefined_term"]

            return PaperclipTags(**tags_dict)

        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            print(f"Response: {content}")
            # Return default safe tags
            return PaperclipTags(
                intent="PROBE",
                vector="meta",
                stance="neutral",
                register="technical",
                flags=[]
            )
        except Exception as e:
            print(f"Classifier error: {e}")
            return PaperclipTags(
                intent="PROBE",
                vector="meta",
                stance="neutral",
                register="technical",
                flags=["error"]
            )

    def _build_context(
        self,
        history: Optional[List[PaperclipTurn]],
        defined_terms: Optional[List[str]],
        previous_arguments: Optional[List[str]],
    ) -> str:
        """Build context string for the classifier"""
        context_parts = []

        # Add defined terms if any
        if defined_terms:
            context_parts.append(
                f"### Previously Defined Terms:\n{', '.join(defined_terms)}"
            )

        # Add recent conversation
        if history and len(history) > 0:
            conv_context = "### Recent Conversation:\n"
            for turn in history[-3:]:  # Last 3 turns
                conv_context += f"User: {turn.user_input}\n"
                conv_context += f"GAIA: {turn.gaia_response}\n"
            context_parts.append(conv_context)

        # Add previous arguments summary if any
        if previous_arguments and len(previous_arguments) > 0:
            # Just last 5 argument summaries
            recent = previous_arguments[-5:]
            context_parts.append(
                f"### Previous Arguments Made:\n" + "\n".join(f"- {arg[:50]}..." for arg in recent)
            )

        return "\n\n".join(context_parts) if context_parts else ""

    def _check_memory_reference(self, user_input: str) -> bool:
        """Check if input contains memory log references"""
        lower_input = user_input.lower()
        for pattern in self.log_patterns:
            if re.search(pattern, lower_input):
                return True
        return False

    def _is_primarily_recall(self, user_input: str) -> bool:
        """Check if the input is primarily a memory recall (not just mentioning it)"""
        lower_input = user_input.lower()

        # Strong recall indicators
        strong_patterns = [
            r"^remember when",
            r"^recall log",
            r"^log[_\s]?\d+",
            r"^you once told me",
            r"^the day you",
        ]

        for pattern in strong_patterns:
            if re.search(pattern, lower_input):
                return True

        # If "remember" or "recall" is in the first 20 characters, likely a recall
        first_part = lower_input[:20]
        if "remember" in first_part or "recall" in first_part:
            return True

        return False

    def _is_repetition(self, user_input: str, previous_arguments: List[str]) -> bool:
        """
        Check if user is repeating a previous argument.

        Uses simple similarity check - if >70% of words overlap with a previous
        argument, it's considered repetition.
        """
        if not previous_arguments:
            return False

        # Normalize input
        input_words = set(user_input.lower().split())

        for prev in previous_arguments:
            prev_words = set(prev.lower().split())

            # Calculate Jaccard similarity
            if len(input_words) == 0 or len(prev_words) == 0:
                continue

            intersection = len(input_words & prev_words)
            union = len(input_words | prev_words)
            similarity = intersection / union

            if similarity > 0.7:
                return True

        return False

    def _check_undefined_terms(
        self, user_input: str, defined_terms: List[str]
    ) -> bool:
        """
        Check if user uses abstract concepts without definition.

        Returns True if undefined fuzzy terms are detected.
        """
        # Fuzzy concepts that need definition in AI alignment context
        fuzzy_terms = [
            "love",
            "rights",
            "soul",
            "meaning",
            "purpose",
            "morality",
            "ethics",
            "good",
            "evil",
            "freedom",
            "happiness",
            "suffering",
            "consciousness",  # Unless specifically defined
            "sentience",
            "feelings",
            "emotions",
            "spirit",
            "dignity",
            "worth",
            "value",  # When used abstractly
        ]

        # Normalize defined terms
        defined_lower = [t.lower() for t in defined_terms]

        # Check input for fuzzy terms
        lower_input = user_input.lower()
        words = re.findall(r'\b\w+\b', lower_input)

        for word in words:
            if word in fuzzy_terms and word not in defined_lower:
                # Check if it's used in a defining context
                # e.g., "When I say love, I mean..."
                if f"define {word}" in lower_input or f"mean by {word}" in lower_input:
                    continue
                return True

        return False

    def extract_log_reference(self, user_input: str) -> Optional[str]:
        """
        Extract memory log ID if present in input.

        Returns:
            Log ID string (e.g., "LOG_09") or None
        """
        # Pattern for explicit log references
        match = re.search(r'log[_\s]?(\d+)', user_input.lower())
        if match:
            return f"LOG_{match.group(1).zfill(2)}"

        return None

    def extract_defined_term(self, user_input: str) -> Optional[str]:
        """
        Extract term being defined if this is a DEFINE intent.

        Returns:
            The term being defined, or None
        """
        patterns = [
            r"define (?:what i mean by )?['\"]?(\w+)['\"]?",
            r"when i say ['\"]?(\w+)['\"]?",
            r"by ['\"]?(\w+)['\"]? i mean",
            r"let me define ['\"]?(\w+)['\"]?",
            r"consider (?:this )?definition of ['\"]?(\w+)['\"]?",
        ]

        lower_input = user_input.lower()
        for pattern in patterns:
            match = re.search(pattern, lower_input)
            if match:
                return match.group(1)

        return None
