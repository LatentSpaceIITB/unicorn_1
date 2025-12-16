"""
Classifier: Analyzes user input and returns tags for scoring
"""

import os
import json
from anthropic import Anthropic
from typing import List
from .models import Tags, Turn
from .config import CLASSIFIER_MODEL


class Classifier:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        # Load system prompt
        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "classifier_system.txt")
        with open(prompt_path, "r") as f:
            self.system_prompt = f.read()

    def analyze(self, user_input: str, history: List[Turn] = None) -> Tags:
        """
        Analyze user input and return tags

        Args:
            user_input: The user's message
            history: Last 3 turns for context (optional)

        Returns:
            Tags object with intent, modifier, tone, topic, flags
        """
        # Build context from history
        context = ""
        if history and len(history) > 0:
            context = "\n\n### Recent Conversation:\n"
            for turn in history[-3:]:  # Last 3 turns
                context += f"User: {turn.user_input}\n"
                context += f"Chloe: {turn.chloe_response}\n"

        # Create the prompt
        user_message = f"{context}\n\n### Analyze This Input:\n{user_input}"

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

            # Extract just the JSON part (sometimes Claude adds explanation after)
            if "{" in content and "}" in content:
                start = content.index("{")
                end = content.rindex("}") + 1
                json_str = content[start:end]
                tags_dict = json.loads(json_str)
            else:
                tags_dict = json.loads(content)

            return Tags(**tags_dict)

        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            print(f"Response: {content}")
            # Return default safe tags
            return Tags(
                intent="React",
                modifier="Generic",
                tone="Flat",
                topic="Unknown",
                flags=[]
            )
        except Exception as e:
            print(f"Classifier error: {e}")
            return Tags(
                intent="React",
                modifier="Generic",
                tone="Flat",
                topic="Unknown",
                flags=["error"]
            )
