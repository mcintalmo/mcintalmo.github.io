from playwright.sync_api import Page


class BasePage:
    """
    Base Page Object Model encapsulating common Playwright actions
    and explicit wait strategies.
    """

    def __init__(self, page: Page):
        self.page = page

    def navigate(self, url: str):
        """Navigate to a specific URL."""
        self.page.goto(url)
        self.wait_for_load_state()

    def wait_for_load_state(self, state: str = "networkidle"):
        """Wait for the page to reach a specific load state."""
        self.page.wait_for_load_state(state)

    def click(self, selector: str):
        """Robust click on an element, waiting for it to be visible and actionable."""
        self.page.locator(selector).click()

    def fill(self, selector: str, text: str):
        """Robust fill text, waiting for element to be visible."""
        self.page.locator(selector).fill(text)

    def get_text(self, selector: str) -> str:
        """Get the text content of an element."""
        return self.page.locator(selector).inner_text()

    def get_page_content(self) -> str:
        """
        Utility method to extract the page DOM.
        This provides the flexibility to pass the page state to an LLM-based
        evaluator or agent to 'kick the tires' on the website autonomously.
        """
        return self.page.content()
