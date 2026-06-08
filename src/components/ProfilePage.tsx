import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useHistory, useLocation, useParams } from 'react-router-dom';
import {
  Button,
  Container,
  Grid,
  Header,
  Icon,
  Loader,
  Modal,
  Table,
} from 'semantic-ui-react';
import UserProfile from 'shared/types/userProfile';
import { fetchProfile, fetchUsers, updateContestRecords } from '../actions';
import firebase from '../firebase';
import {
  RatingGraph,
  DebugLastUpdateTime,
  dateAndTimeStringFromSeconds,
} from '../anytime-ui';
import type { RatingBand } from '../anytime-ui';
import getRatingColorStyle from '../utils/getRatingColorStyle';
import {
  useAccountInfo,
  useIsUpdatingRating,
  useProfile,
  useUsers,
} from '../hooks';
import { getCertificate } from '../utils/getCertificate';
import { getTwitterMessage } from '../utils/getTwitterMessage';

const ProfilePage: React.FC = () => {
  const history = useHistory();
  const urlParams = useParams<{ id: string }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const dispatch = useDispatch();
  const account = useAccountInfo();
  const users = useUsers();
  const profile = useProfile();
  const isUpdatingRating = useIsUpdatingRating();

  const [certIdx, setCertIdx] = useState(-1);
  const [isEnglish, setIsEnglish] = useState(false);

  useEffect(() => {
    if (queryParams.get('cert')) {
      setCertIdx(Number(queryParams.get('cert')));
    }
    if (queryParams.get('lang')) {
      setIsEnglish(queryParams.get('lang') === 'en');
    }
  }, []);

  useEffect(() => {
    if (!account.id || account.id !== urlParams.id) {
      return;
    }

    dispatch(
      fetchProfile(
        account.id,
        () => {
          if (!isUpdatingRating) {
            dispatch(updateContestRecords());
          }
        },
        () => {
          history.push('/profile/update');
        }
      )
    );
  }, [dispatch, account, history, urlParams.id]);

  useEffect(() => {
    if (Object.keys(users).length === 0) {
      dispatch(
        fetchUsers(
          (currentUsers: { [id: string]: UserProfile }) => {
            if (!currentUsers[urlParams.id]) {
              history.push('/profile/update');
            }
          },
          () => {
            history.push('/');
          }
        )
      );
    }
  }, [dispatch, history, urlParams.id]);

  if (!users[urlParams.id]) {
    return null;
  }

  let userInfo = users[urlParams.id];
  if (profile.records.length > 0 && account?.id === urlParams.id) {
    userInfo = profile;
  }

  let certificate = null;
  if (certIdx >= 0 && userInfo.records[userInfo.records.length - certIdx - 1]) {
    certificate = getCertificate(
      userInfo,
      userInfo.records.length - certIdx - 1
    );
  }

  const data: { name: string; time: number; rating: number }[] = [];
  userInfo.records.forEach((record) => {
    if (
      record.contestID === 'registration' ||
      record.isRated === true ||
      record.isRated === undefined // 旧バージョン互換
    ) {
      data.push({
        name: record.contestName,
        time: record.startTime,
        rating: record.newRating,
      });
    }
  });
  data.reverse();

  const AC_RATING_BANDS: RatingBand[] = [
    { y1: 2800, y2: 9999, color: '#FF0000' },
    { y1: 2400, y2: 2800, color: '#FF8000' },
    { y1: 2000, y2: 2400, color: '#C0C000' },
    { y1: 1600, y2: 2000, color: '#0000FF' },
    { y1: 1200, y2: 1600, color: '#00C0C0' },
    { y1: 800,  y2: 1200, color: '#008000' },
    { y1: 400,  y2: 800,  color: '#804000' },
    { y1: 0,    y2: 400,  color: '#808080' },
  ];
  const AC_Y_TICKS = [400, 800, 1200, 1600, 2000, 2400, 2800];

  return (
    <>
      <Loader inverted={true} active={isUpdatingRating} />
      <Header as="h2" style={getRatingColorStyle(userInfo.rating)}>
        {userInfo.handle}
        &nbsp;
        <a
          href={`https://atcoder.jp/users/${userInfo.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'black', fontSize: '18px' }}
        >
          <Icon name="external alternate" />
        </a>
      </Header>
      {(() => {
        if (account?.id === urlParams.id) {
          return (
            <Link to="/profile/update">
              <Button
                basic={true}
                floated="right"
                content="User setting"
                color="green"
              />
            </Link>
          );
        }
      })()}
      <Header as="h4">
        Checked submission : {dateAndTimeStringFromSeconds(userInfo.lastUpdateTime)}
      </Header>
      {process.env.REACT_APP_ENV === 'develop' && account?.id === urlParams.id && (
        <DebugLastUpdateTime
          onApply={async (t) => {
            await firebase.firestore().collection('users').doc(account.id).update({ lastUpdateTime: t });
            dispatch(fetchProfile(account.id));
          }}
        />
      )}
      <RatingGraph
        data={data}
        ratingBands={AC_RATING_BANDS}
        yTicks={AC_Y_TICKS}
        getRatingColorStyle={getRatingColorStyle}
      />
      <Table unstackable={true} celled={true}>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Date</Table.HeaderCell>
            <Table.HeaderCell>Contest</Table.HeaderCell>
            <Table.HeaderCell>Rank</Table.HeaderCell>
            <Table.HeaderCell>Perf.</Table.HeaderCell>
            <Table.HeaderCell>Rating</Table.HeaderCell>
            <Table.HeaderCell>Delta</Table.HeaderCell>
            <Table.HeaderCell>Cert.</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {userInfo.records.map((record, idx) => {
            const cert = getCertificate(userInfo, idx);

            return (
              <Table.Row key={record.startTime}>
                <Table.Cell>
                  {dateAndTimeStringFromSeconds(record.startTime)}
                </Table.Cell>
                <Table.Cell>
                  {record.contestID === 'registration' ? (
                    record.contestName
                  ) : (
                    <a
                      href={`https://atcoder.jp/contests/${record.contestID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {record.contestName}
                    </a>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {record.contestID === 'registration' ? (
                    record.rank
                  ) : (
                    <a
                      href={`https://atcoder.jp/contests/${record.contestID}/standings/virtual/?watching=${userInfo.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {record.rank}
                    </a>
                  )}
                </Table.Cell>
                <Table.Cell style={getRatingColorStyle(cert.performance)}>
                  {cert.performance}
                </Table.Cell>
                <Table.Cell style={getRatingColorStyle(record.newRating)}>
                  {record.newRating}
                </Table.Cell>
                <Table.Cell>{cert.deltaString}</Table.Cell>
                <Table.Cell>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setCertIdx(userInfo.records.length - idx - 1);
                    }}
                  >
                    <Icon name="file outline" />
                  </div>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>

      <Modal open={!!certificate} onClose={() => setCertIdx(-1)}>
        {certificate ? (
          <>
            <Modal.Header>
              <Icon name="certificate" color="yellow" />
              {isEnglish ? <>Contest Result</> : <>コンテスト成績表</>}
              <Button.Group floated="right">
                <Button
                  compact={true}
                  positive={!isEnglish}
                  onClick={() => {
                    if (isEnglish) {
                      setIsEnglish(false);
                    }
                  }}
                >
                  JP
                </Button>
                <Button.Or />
                <Button
                  compact={true}
                  positive={isEnglish}
                  onClick={() => {
                    if (!isEnglish) {
                      setIsEnglish(true);
                    }
                  }}
                >
                  EN
                </Button>
              </Button.Group>
            </Modal.Header>
            <Modal.Content>
              <Container text={true}>
                <Grid style={{ fontWeight: 'bold' }}>
                  <Grid.Row>
                    <Grid.Column width={4}>
                      {isEnglish ? <>User</> : <>ユーザー</>}
                    </Grid.Column>
                    <Grid.Column width={12}>
                      <span style={getRatingColorStyle(certificate.newRating)}>
                        {userInfo.handle}
                      </span>
                    </Grid.Column>
                  </Grid.Row>
                  <Grid.Row>
                    <Grid.Column width={4}>
                      {isEnglish ? <>Contest</> : <>コンテスト</>}
                    </Grid.Column>
                    <Grid.Column width={12}>
                      {certificate.contestName}
                    </Grid.Column>
                  </Grid.Row>
                  <Grid.Row>
                    <Grid.Column width={4}>
                      {isEnglish ? <>Rank</> : <>順位</>}
                    </Grid.Column>
                    <Grid.Column>{certificate.rankString}</Grid.Column>
                  </Grid.Row>
                  <Grid.Row>
                    <Grid.Column width={4}>
                      {isEnglish ? <>Performance</> : <>パフォーマンス</>}
                    </Grid.Column>
                    <Grid.Column>
                      <span
                        style={getRatingColorStyle(certificate.performance)}
                      >
                        {certificate.performance}
                      </span>
                    </Grid.Column>
                  </Grid.Row>
                  <Grid.Row>
                    <Grid.Column width={4}>
                      {isEnglish ? <>Rating change</> : <>レート変動</>}
                    </Grid.Column>
                    <Grid.Column width={12}>
                      <span style={getRatingColorStyle(certificate.oldRating)}>
                        {certificate.oldRating}
                      </span>
                      &nbsp;→&nbsp;
                      <span style={getRatingColorStyle(certificate.newRating)}>
                        {certificate.newRating}
                      </span>
                      &nbsp; ({certificate.deltaString}) &nbsp;
                      <span style={{ color: 'red' }}>
                        {certificate.isHighest ? 'Highest!' : ''}
                      </span>
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              </Container>
            </Modal.Content>
            <Modal.Actions>
              <Button
                color="twitter"
                circular={true}
                content="Tweet"
                icon="twitter"
                as="a"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  getTwitterMessage(
                    urlParams.id,
                    certificate,
                    certIdx,
                    isEnglish
                  )
                )}`}
                target="_blank"
              />
              <Button content="閉じる" onClick={() => setCertIdx(-1)} />
            </Modal.Actions>
          </>
        ) : null}
      </Modal>
      <script async={true} src="https://platform.twitter.com/widgets.js" />
    </>
  );
};

export default ProfilePage;
