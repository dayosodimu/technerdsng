@a11y @semantics
Feature: Page structure, landmarks and semantics
  As a screen-reader user
  I want consistent landmarks, headings, titles and text alternatives
  So that I can understand and navigate each page

  # TC-SEM-01..07 — WCAG 1.3.1, 2.4.2, 2.4.6, 3.1.1
  @positive
  Scenario Outline: <page> page has a correct document outline
    Given I open the "<page>" page
    Then the document language should be "en"
    And the page title should be descriptive and mention "Technerds"
    And the page should have exactly one level-1 heading
    And heading levels should not skip
    And the page should expose banner, navigation, main and contentinfo landmarks

    Examples:
      | page           |
      | Home           |
      | About Us       |
      | Services       |
      | News           |
      | Process        |
      | Contact        |
      | Privacy Policy |

  # TC-SEM-08 — WCAG 2.4.2
  @positive
  Scenario: Every page has a unique title
    When I visit every public page
    Then every page title should be unique

  # TC-SEM-09 — WCAG 1.1.1 / 2.4.4 / 4.1.2
  @positive @smoke
  Scenario: Images, links and buttons on the Home page have text alternatives
    Given I open the "Home" page
    Then every image should have an alt attribute or be hidden from assistive technology
    And every link should have a discernible accessible name
    And every button should have a discernible accessible name
    And every email link text should state the email address

  # TC-SEM-10 — WCAG 1.3.1
  @positive
  Scenario: Home page lists all six services as headed articles
    Given I open the "Home" page
    Then the services section should contain 6 service cards each with a level-3 heading

  # TC-SEM-11 — WCAG 2.4.5 Multiple Ways / 3.2.3
  @negative @known-defect @wcag-2.4.5
  Scenario: Unknown URL shows an accessible 404 page with a way back
    Given I open the URL "/this-page-does-not-exist"
    Then the page title should contain "not found"
    And the page should have exactly one level-1 heading
    And the page should offer a link back to the Home page
    And the page should expose banner, navigation, main and contentinfo landmarks
