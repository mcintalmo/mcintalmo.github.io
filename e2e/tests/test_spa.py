from pages.spa_page import SpaPage

# We assume the frontend is running locally, e.g., on port 4321 for Astro
# You can override this using pytest --base-url=... if pytest-base-url is configured
DEFAULT_URL = "http://127.0.0.1:4321"


def test_spa_loads_successfully(page, app_url):
    """
    Smoke test to verify that the SPA loads and displays its main heading.
    """
    spa = SpaPage(page)

    # 1. Navigate to the application
    spa.load(app_url)

    # 2. Verify it loaded properly
    spa.verify_loaded()

    # 3. Basic assertions
    heading_text = spa.get_main_heading_text()
    assert len(heading_text) > 0, "Main heading should not be empty"


def test_spa_dom_extraction(page, app_url):
    """
    Example test showing how an LLM agent could extract the DOM
    using the base page functionality to 'kick the tires'.
    """
    spa = SpaPage(page)
    spa.load(app_url)

    # Extract raw DOM for LLM processing
    dom_content = spa.get_page_content()

    # Simple sanity check
    assert "<html" in dom_content.lower()
    assert "<body" in dom_content.lower()


def test_resume_download(page, app_url):
    """
    Verify that clicking the 'Download Resume' button triggers a download
    for the correct resume PDF file and returns a non-empty file.
    """
    spa = SpaPage(page)
    spa.load(app_url)

    # Trigger download of resume
    with page.expect_download() as download_info:
        page.locator("a[download]").click()

    download = download_info.value
    assert download.suggested_filename == "McIntosh_Alexander_Resume.pdf"

    # Save the file to a temp path and check size
    path = download.path()
    assert path is not None
    import os

    size = os.path.getsize(path)
    assert size > 0, "Downloaded PDF file should not be empty"
