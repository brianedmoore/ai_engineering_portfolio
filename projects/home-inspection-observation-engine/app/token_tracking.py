from dataclasses import dataclass

@dataclass
class TokenUsage:
    input_tokens: int
    output_tokens: int
    model: str
    provider: str

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens

    def to_dict(self) -> dict:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
            "model": self.model,
            "provider": self.provider,
        }

def extract_token_usage(response, provider: str, model: str) -> TokenUsage:
    if provider == "anthropic":
        return TokenUsage(
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            model=model,
            provider=provider,
        )
    elif provider == "openai":
        return TokenUsage(
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
            model=model,
            provider=provider,
        )
    raise ValueError(f"Unknown Provider: {provider}")