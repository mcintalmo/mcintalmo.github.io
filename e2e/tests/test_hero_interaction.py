import random

from playwright.sync_api import Page, expect


def test_hero_text_chat_flow(page: Page, app_url):
    """
    Verifies that entering text in the hero section chat input and clicking Send
    opens the sidebar, initiates the room connection, and submits the prompt.
    """
    room_id = f"test-hero-text-{random.randint(1000, 9999)}"
    url = f"{app_url}/?room={room_id}"

    page.goto(url)

    # Find the hero prompt text input
    hero_input = page.locator('input[placeholder="Ask Alex\'s AI Agent..."]')
    expect(hero_input).to_be_visible(timeout=30000)

    # Type a message
    prompt = "Can you show me Alex's skills?"
    hero_input.fill(prompt)

    # Click the send button next to it
    send_btn = page.locator('#home form button[type="submit"]')
    send_btn.click()

    # The sidebar chat form should become visible
    chat_input = page.locator(".lk-chat-form-input")
    expect(chat_input).to_be_visible(timeout=5000)

    # Wait for the agent to connect and go online
    agent_status = page.locator("#agent-status")
    expect(agent_status).to_have_text("(Online)", timeout=30000)

    # Verify our sent message appears in the chat transcript
    user_msg = page.locator(
        '.lk-chat-entry[data-lk-message-origin="local"] .lk-message-body'
    )
    expect(user_msg.first).to_have_text(prompt, timeout=5000)

    # Verify the agent's response appears
    agent_msg = page.locator(
        '.lk-chat-entry[data-lk-message-origin="remote"] .lk-message-body'
    )
    expect(agent_msg.first).to_be_visible(timeout=90000)


def test_hero_live_voice_flow(page: Page, app_url):
    """
    Verifies that clicking the circular live voice button in the hero section
    opens the sidebar and switches directly to voice chat mode.
    """
    room_id = f"test-hero-voice-{random.randint(1000, 9999)}"
    url = f"{app_url}/?room={room_id}"

    page.goto(url)

    # Locate the circular voice button in the hero section
    voice_btn = page.locator('button[aria-label="Start Live Voice Chat"]')
    expect(voice_btn).to_be_visible(timeout=30000)

    # Click it
    voice_btn.click()

    # The chat widget should open, and voice mode elements
    # (like the control bar) should be present.
    control_bar = page.locator("#voice-assistant-control-bar")
    # Wait up to 5 seconds for the voice mode components to render
    expect(control_bar).to_be_visible(timeout=5000)
