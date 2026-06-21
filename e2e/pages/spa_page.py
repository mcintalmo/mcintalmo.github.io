from playwright.sync_api import Page, expect

from .base_page import BasePage


class SpaPage(BasePage):
    """
    Page Object for the Single Page Application (Interactive Portfolio).
    """

    def __init__(self, page: Page):
        super().__init__(page)
        # Using generic accessible roles where possible
        self.main_heading = page.get_by_role("heading", level=1)
        # Assumes a navigation bar exists
        self.nav_bar = page.locator("nav")

    def load(self, url: str):
        """Navigate to the SPA and wait for it to be ready."""
        self.navigate(url)

    def verify_loaded(self):
        """Assert that the primary elements of the SPA have loaded."""
        # We use expect for built-in retryability and stability
        expect(self.main_heading.first).to_be_visible()

    def get_main_heading_text(self) -> str:
        """Returns the text of the first H1 heading."""
        return self.main_heading.first.inner_text()
