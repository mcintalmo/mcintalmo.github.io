from playwright.sync_api import Page, expect


def test_theme_toggle_persistence(page: Page, app_url: str):
    """
    Verifies that clicking the theme capsule buttons switches between
    Light and Dark mode and updates the DOM theme class on <html> accordingly.
    """
    page.goto(f"{app_url}/")

    html = page.locator("html")
    dark_btn = page.locator('button[aria-label="Set dark theme"]').first
    light_btn = page.locator('button[aria-label="Set light theme"]').first

    expect(dark_btn).to_be_visible(timeout=10000)
    expect(light_btn).to_be_visible(timeout=10000)

    # Switch to Dark theme
    dark_btn.click()
    expect(html).to_have_class("dark", timeout=5000)

    # Switch to Light theme
    light_btn.click()
    expect(html).to_have_class("light", timeout=5000)


def test_work_experience_card_expansion(page: Page, app_url: str):
    """
    Verifies that clicking an experience card expands its details,
    displaying full achievements, impact bullets, and technology tags.
    """
    page.goto(f"{app_url}/#experience")

    # Ensure experience section is in view
    experience_section = page.locator("#experience")
    expect(experience_section).to_be_visible(timeout=10000)

    # Find the first clickable experience card (e.g. Optum)
    experience_card = (
        page.locator('article, div[role="button"]').filter(has_text="Optum").first
    )
    expect(experience_card).to_be_visible(timeout=10000)

    # Click the card to expand details
    experience_card.click()

    # Verify achievements and skills badges are revealed
    achievements = experience_card.locator('h4:has-text("Achievements"), ul')
    expect(achievements.first).to_be_visible(timeout=5000)


def test_section_navigation(page: Page, app_url: str):
    """
    Verifies that desktop navigation bar links scroll to their target sections.
    """
    page.goto(f"{app_url}/")

    sections = ["skills", "projects", "experience", "education", "contact"]
    for section_id in sections:
        nav_link = page.locator(f'nav a[href="#{section_id}"]').first
        if nav_link.is_visible():
            nav_link.click()
            target_section = page.locator(f"#{section_id}")
            expect(target_section).to_be_visible(timeout=5000)


def test_chat_widget_open_and_online_state(page: Page, app_url: str):
    """
    Verifies that clicking the chat FAB button opens the chat drawer,
    initiates the room connection, and shows the Online status.
    """
    console_logs = []
    page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

    page.goto(f"{app_url}/")

    # Click floating action button
    fab = page.locator("#chat-fab")
    expect(fab).to_be_visible(timeout=10000)
    fab.click()

    # Chat input and agent status should be visible
    chat_input = page.locator(".lk-chat-form-input")
    expect(chat_input).to_be_visible(timeout=10000)

    try:
        agent_status = page.locator("#agent-status")
        expect(agent_status).to_have_text("(Online)", timeout=35000)
    finally:
        print("\n--- BROWSER CONSOLE LOGS ---")
        for log in console_logs:
            print(log)
        print("----------------------------\n")


def test_business_card_navigation_and_qr_toggle(page: Page, app_url: str) -> None:
    """
    Verifies that /card renders the digital business card by default,
    allows toggling to the QR code view (updating the URL parameter ?view=qr),
    allows toggling back to the contact card, and verifies direct deep-linking.
    """
    page.goto(f"{app_url}/card")

    # 1. Contact Card View is default
    name_heading = page.locator('h1:has-text("Alex McIntosh")')
    save_contact_btn = page.locator('button:has-text("Save to Contacts")')
    show_qr_btn = page.locator('button:has-text("Show QR Code")')

    expect(name_heading).to_be_visible(timeout=10000)
    expect(save_contact_btn).to_be_visible(timeout=10000)
    expect(show_qr_btn).to_be_visible(timeout=10000)

    # 2. Toggle to QR Code view
    show_qr_btn.click()

    qr_heading = page.locator('text="Scan to Connect"')
    qr_image = page.locator('img[alt*="QR code"]')
    show_card_btn = page.locator('button:has-text("Show Contact Card")')

    expect(qr_heading).to_be_visible(timeout=10000)
    expect(qr_image).to_be_visible(timeout=10000)
    expect(show_card_btn).to_be_visible(timeout=10000)
    expect(page).to_have_url(f"{app_url}/card?view=qr")

    # 3. Toggle back to Contact Card
    show_card_btn.click()
    expect(name_heading).to_be_visible(timeout=10000)
    expect(page).to_have_url(f"{app_url}/card")

    # 4. Direct deep link with ?view=qr opens directly in QR view
    page.goto(f"{app_url}/card?view=qr")
    expect(qr_heading).to_be_visible(timeout=10000)
    expect(qr_image).to_be_visible(timeout=10000)
