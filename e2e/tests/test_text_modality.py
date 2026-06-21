import random

import pytest
from playwright.sync_api import Page, expect


def test_text_modality_end_to_end(page: Page, app_url, browser_name):
    """
    Verifies text modality with console log capturing.
    """
    if browser_name == "firefox":
        import socket

        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("10.255.255.255", 1))
            ip = s.getsockname()[0]
            s.close()
            if ip.startswith("10.2.0."):
                pytest.skip("Skipping Firefox WebRTC test under VPN")
        except Exception:
            pass
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    room_id = f"test-room-{random.randint(1000, 9999)}"
    url = f"{app_url}/?room={room_id}"

    try:
        # 1. Load the portfolio page
        page.goto(url)

        # 2. Wait for the chat FAB button to become visible.
        fab = page.locator("#chat-fab")
        expect(fab).to_be_visible(timeout=30000)

        # 3. Open the chat widget
        fab.click()

        # 4. Wait for the chat input form to become visible
        chat_input = page.locator(".lk-chat-form-input")
        expect(chat_input).to_be_visible(timeout=5000)

        # Wait for the agent to connect and go online
        agent_status = page.locator("#agent-status")
        expect(agent_status).to_have_text("(Online)", timeout=30000)

        # 5. Type message asking about Alex's skills
        chat_input.fill("What can you tell me about Alex's skills?")
        chat_input.press("Enter")

        # 6. Verify our sent message appears in the chat transcript
        user_msg = page.locator(
            '.lk-chat-entry[data-lk-message-origin="local"] .lk-message-body'
        )
        expect(user_msg.first).to_have_text(
            "What can you tell me about Alex's skills?", timeout=5000
        )

        # 7. Wait for the agent's response to appear
        agent_msg = page.locator(
            '.lk-chat-entry[data-lk-message-origin="remote"] .lk-message-body'
        )
        expect(agent_msg.first).to_be_visible(timeout=90000)

        response_text = agent_msg.first.inner_text()
        print("Agent Response received:")
        print(response_text)

        assert len(response_text) > 0, "Agent response should not be empty"
        assert "{" not in response_text, "Response should be natural language, not JSON"

        # 8. Verify navigation event was triggered (scrolled to `#skills`)
        skills_section = page.locator("#skills")
        expect(skills_section).to_be_visible(timeout=5000)

    finally:
        print("\n--- BROWSER CONSOLE LOGS ---")
        for log in console_logs:
            print(log)
        print("----------------------------\n")
