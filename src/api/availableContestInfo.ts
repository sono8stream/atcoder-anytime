import AvailableContestInfo from '../types/availableContestInfo';

export const fetchAvailableContestInfoAPI = async () => {
  try {
    const url = 'https://kenkoooo.com/atcoder/resources/contests.json';
    const response = await fetch(url);
    const json = await response.json();
    let data = json as AvailableContestInfo[];

    data = data.filter((info) => info.rate_change !== '-');
    data.sort((a, b) => b.start_epoch_second - a.start_epoch_second);

    return data;
  } catch (e) {
    throw e;
  }
};
