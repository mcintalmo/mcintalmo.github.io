from playwright.sync_api import Page, expect


def test_highlight_text_and_expand_experience_e2e(page: Page, app_url):
    """
    Verifies that the portfolio client-side correctly handles agent actions:
    1. Expanding an experience card programmatically (with history auto-expansion).
    2. Highlighting a specific text string dynamically.
    3. Resetting all interactive agent-driven UI states.
    """
    url = f"{app_url}/"
    page.goto(url)

    # ----------------------------------------------------
    # 1. Verify Card Expansion Capability
    # ----------------------------------------------------
    # Ensure experience section is loaded
    experience_section = page.locator("#experience")
    expect(experience_section).to_be_visible(timeout=30000)

    # Initially, achievements for a card are hidden/collapsed.
    # Let's locate the Optum card (which is a core visible experience).
    optum_card = page.locator('article, div[role="button"]', has_text="Optum").first
    expect(optum_card).to_be_visible(timeout=5000)

    # Assert achievements lists are collapsed initially
    achievements_optum = optum_card.locator('h4:has-text("Achievements")')
    expect(achievements_optum).not_to_be_visible()

    # Dispatch custom event to expand the Optum experience card
    page.evaluate(
        'window.dispatchEvent(new CustomEvent("agent-action", { '
        'detail: { type: "expand-experience", company: "Optum" } '
        "}))"
    )

    # Achievements header should now be visible within the card
    expect(achievements_optum).to_be_visible(timeout=5000)

    # ----------------------------------------------------
    # 2. Verify Text Highlighting Capability
    # ----------------------------------------------------
    # Dispatch custom event to highlight "Physics"
    page.evaluate(
        'window.dispatchEvent(new CustomEvent("agent-action", { '
        'detail: { type: "highlight-text", text: "Physics" } '
        "}))"
    )

    # A <mark> element with the class 'agent-text-highlight'
    # should be generated and visible
    highlighted_mark = page.locator("mark.agent-text-highlight")
    expect(highlighted_mark).to_be_visible(timeout=5000)
    expect(highlighted_mark.first).to_have_text("Physics")

    # ----------------------------------------------------
    # 3. Verify Reset Functionality
    # ----------------------------------------------------
    # Dispatch custom event to reset highlights
    page.evaluate(
        'window.dispatchEvent(new CustomEvent("agent-action", { '
        'detail: { type: "reset" } '
        "}))"
    )

    # Highlights should be gone
    expect(highlighted_mark).not_to_be_visible(timeout=5000)
