# Yuang Zhang's academic homepage

Personal academic site based on [academic-homepage](https://github.com/luost26/academic-homepage), a Jekyll template for GitHub Pages.

## Updating the site

- Edit `_data/profile.yml` for the biography, contact links, and education.
- Add a Markdown file under `_publications/<year>/` for each new paper.
- Add dated Markdown files under `_news/` for announcements.
- Edit `_data/navigation.yml` to add or remove pages.
- If a portrait or public CV is available, put it in `assets/` and set `portrait_url` or `cv_link` in `_data/profile.yml`.

The repository is intended to be named `dasddassad.github.io` with an empty `baseurl` in `_config.yml`. In GitHub repository settings, select **Deploy from a branch**, **main**, and **/(root)** for GitHub Pages.

For local development, install Ruby and Bundler, then run `bundle install` and `bundle exec jekyll serve`.
