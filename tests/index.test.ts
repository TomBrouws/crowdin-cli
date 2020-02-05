import axios from 'axios'
import FormData from 'form-data';
import fs from 'fs';

import { BASE_URL } from './../src/utils/client';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import expected from './fixtures/expected.json';

jest.mock('axios');
jest.mock('form-data');

const axiosGet = jest.fn((url) => {
  /**
   * export file response
   */
  if (/export-file/.test(url)) {
    return Promise.resolve({
      data: {
        "mollie-crowdin-content": { message: "Dit is een test" },
        "mollie-crowdin-title": { message: "Titel" }
      },
    });
  }

  /**
   * create branch response
   */
  return Promise.resolve({
    data: {
      succes: true,
    }
  });
});

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
axios.get = axiosGet;

const axiosPost = jest.fn(() => Promise.resolve({
  /**
   * upload file response
   */
  data: {
    success: true,
  }
}));

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
axios.post = axiosPost;

describe('mollie-crowdin cli', () => {
  const config = require('../src/config').default;
  const program = require('../src/cli').default;

  it('collects all the messages from a component and creates a english.source.json', async () => {
    expect.assertions(1);
    await program(['node', 'test', 'collect', './tests/fixtures/**.tsx']);
    expect(
      fs.existsSync(`${config.INTL_DIR}/english.source.json`)
    ).toBeTruthy();
  })

  it('outputs english.source.json that matches the expected json file', async () => {
    expect.assertions(1);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sourceJson = require(`${config.INTL_DIR}/english.source.json`);
    expect(sourceJson).toEqual(expected);
  });

  it('creates a directory on crowdin and uploads the collected messages', async () => {
    expect.assertions(2);
    await program(['node', 'test', 'upload', './tests/fixtures/**.tsx']);

    expect(axiosGet).toHaveBeenCalledWith(`${BASE_URL}/add-directory`, {
      params: {
        key: config.CROWDIN_KEY,
        name: 'test-branch',
        is_branch: 1,
        json: 1,
      },
    })

    expect(axiosPost).toHaveBeenCalledWith(`${BASE_URL}/add-file`, expect.any(FormData), {
      params: {
        key: config.CROWDIN_KEY,
        json: 1,
        type: 'chrome',
        branch: 'test-branch',
      },
      headers: {
      }
    });
  });

  it('downloads translated messages from the specified branch from crowdin', async () => {
    expect.assertions(1);
    await program(['node', 'test', 'download']);

    const file = fs.readFileSync(`${config.TRANSLATIONS_DIR}/nl-NL.js`).toString();
    expect(file).toMatchSnapshot()
  });
});