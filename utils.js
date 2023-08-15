/**
 * BASED on electron-gh-releases
 * https://github.com/jenslind/electron-gh-releases
 */

'use strict';

const semver = require('semver')
const got = require('got')
const events = require('events')
const electron = require('electron');
const dialog = electron.dialog
const shell = electron.shell

const REGEX_ZIP_URL = /\/v(\d+\.\d+\.\d+)\/.*\.zip/

module.exports = class extends events.EventEmitter {

  constructor (gh) {
    super()

    let self = this

    self.repo = gh.repo
    self.name = gh.name
    self.repoUrl = 'https://github.com/' + gh.repo
    self.currentVersion = gh.currentVersion
  }

  /**
   * Get tags from this.repo
   */
  _getLatestTag () {
    let url = this.repoUrl + '/releases/latest'
    return got.head(url)
      .then(res => {
        let latestTag = res.socket._httpMessage.path.split('/').pop()
        return latestTag
      })
      .catch(err => {
        if (err) throw new Error('Unable to get latest release tag from Github.')
      })
  }

  /**
   * Get current version from app.
   */
  _getCurrentVersion () {
    return this.currentVersion
  }

  /**
   * Compare current with the latest version.
   */
  _newVersion (latest) {
    return semver.lt(this._getCurrentVersion(), latest)
  }

  /**
   * Get the feed URL from this.repo
   */
  _getFeedUrl (tag) {
    let feedUrl

    return new Promise((resolve, reject) => {
      feedUrl = this.repoUrl + '/releases/download/' + tag
      resolve(feedUrl)
    })

    // Make sure feedUrl exists
    return got.get(feedUrl)
      .then(res => {
        if (res.statusCode === 404) {
          throw new Error('auto_updater.json does not exist.')
        } else if (res.statusCode !== 200) {
          throw new Error('Unable to fetch auto_updater.json: ' + res.body)
        }

        let zipUrl
        try {
          zipUrl = JSON.parse(res.body).url
        } catch (err) {
          throw new Error('Unable to parse the auto_updater.json: ' + err.message + ', body: ' + res.body)
        }

        const matchReleaseUrl = zipUrl.match(REGEX_ZIP_URL)
        if (!matchReleaseUrl) {
          throw new Error('The zipUrl (' + zipUrl + ') is a invalid release URL')
        }

        const versionInZipUrl = matchReleaseUrl[1]
        const latestVersion = semver.clean(tag)
        if (versionInZipUrl !== latestVersion) {
          throw new Error('The feedUrl does not link to latest tag (zipUrl=' + versionInZipUrl + '; latestVersion=' + latestVersion + ')')
        }

        return tag;
      })
  }

}
