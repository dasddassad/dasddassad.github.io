# Yuang Zhang's academic homepage

Personal academic site based on [academic-homepage](https://github.com/luost26/academic-homepage), a Jekyll template for GitHub Pages.

## Updating the site

- Edit `_data/profile.yml` for the biography, contact links, and education.
- Add a Markdown file under `_publications/<year>/` for each new paper.
- Add dated Markdown files under `_news/` for announcements.
- Edit `_data/navigation.yml` to add or remove pages.
- After approving a CV for the website, add its PDF to `assets/files/` and set `cv_link` in `_data/profile.yml` to show a download button.
- If a portrait is available, put it in `assets/` and set `portrait_url` in `_data/profile.yml`.

The repository is named `dasddassad.github.io` with an empty `baseurl` in `_config.yml`.
The website is published at https://dasddassad.github.io/. The repository is public, and GitHub Pages publishes the root folder of the `main` branch.
The site has Home and Publications pages.

For local development, install Ruby and Bundler, then run `bundle install` and `bundle exec jekyll serve`.

The `Check academic homepage` workflow builds the website and saves desktop and mobile layout previews after changes to `main`.
The preview is available under the completed run in the repository's Actions tab.
