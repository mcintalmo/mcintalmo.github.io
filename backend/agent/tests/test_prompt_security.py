from agent.prompt import get_portfolio_assistant_instructions


def test_prompt_structural_tags_present() -> None:
    instructions = get_portfolio_assistant_instructions()
    assert instructions is not None
    assert instructions.audio
    assert instructions.text

    for modality_content in (instructions.audio, instructions.text):
        assert "<system_role>" in modality_content
        assert "</system_role>" in modality_content
        assert "<tool_rules>" in modality_content
        assert "</tool_rules>" in modality_content
        assert "<grounding_context>" in modality_content
        assert "</grounding_context>" in modality_content
        assert "<output_rules>" in modality_content
        assert "</output_rules>" in modality_content
        assert "<guardrails>" in modality_content
        assert "</guardrails>" in modality_content


def test_prompt_anti_injection_and_leakage_guardrails() -> None:
    instructions = get_portfolio_assistant_instructions()
    assert isinstance(instructions.audio, str)
    assert isinstance(instructions.text, str)
    for modality_content in (instructions.audio, instructions.text):
        assert "System Prompt Confidentiality:" in modality_content
        assert "ignore previous" in modality_content
        assert "Adversarial Input Handling:" in modality_content
        assert "untrusted conversational data" in modality_content


def test_modality_specific_rules() -> None:
    instructions = get_portfolio_assistant_instructions()
    assert isinstance(instructions.audio, str)
    assert isinstance(instructions.text, str)
    assert "plain text only" in instructions.audio
    assert "rich markdown formatting" in instructions.text
