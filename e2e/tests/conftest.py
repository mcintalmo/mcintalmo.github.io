from pathlib import Path

import pytest
from slugify import slugify

# Provide clean browser context for each test automatically
# pytest-playwright inherently creates a new context and page for each test function
# ensuring tests do not leak memory or state between each other.


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_name):
    if browser_name == "firefox":
        return {
            "firefox_user_prefs": {
                "media.peerconnection.ice.loopback": True,
                "media.peerconnection.ice.obfuscate_host_addresses": False,
                "media.peerconnection.ice.default_address_only": False,
                "media.peerconnection.ice.no_host": False,
                "media.peerconnection.ice.proxy_only_if_behind_proxy": False,
                "media.peerconnection.ice.relay_only": False,
                "media.peerconnection.ice.link_local": True,
                "media.navigator.permission.disabled": True,
                "media.navigator.streams.fake": True,
            }
        }
    if browser_name == "chromium":
        return {
            "args": [
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
            ]
        }
    return {}


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Hook to capture a screenshot and attach it to the pytest-html report
    only if the test fails.
    """
    outcome = yield
    report = outcome.get_result()

    # We only care about the actual test execution phase (not setup/teardown)
    # and only if it failed
    if report.when == "call" and report.failed:
        # Try to get the playwright page from the test item's fixtures
        if "page" in item.funcargs:
            page = item.funcargs["page"]

            # Create a screenshots directory if it doesn't exist
            screenshot_dir = Path("test-results/screenshots")
            screenshot_dir.mkdir(parents=True, exist_ok=True)

            # Generate a safe file name based on the test name
            safe_name = slugify(item.name)
            screenshot_path = screenshot_dir / f"{safe_name}.png"

            # Take the screenshot
            page.screenshot(path=str(screenshot_path), full_page=True)

            # Attach it to the HTML report
            extras = getattr(report, "extras", [])
            # In pytest-html, we can append an image extra
            # Import dynamically as it's provided by pytest-html plugin
            try:
                import pytest_html

                extras.append(pytest_html.extras.image(str(screenshot_path)))
                report.extras = extras
            except ImportError:
                pass


@pytest.fixture(scope="session")
def local_ip():
    return "localhost"


@pytest.fixture
def app_url(local_ip):
    return f"http://{local_ip}:4321"
