import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Spinner,
  InputGroup,
  Form,
} from "react-bootstrap";
import {
  Search,
  RefreshCw,
  Calendar,
  Globe,
  AlertTriangle,
} from "lucide-react";

const App = () => {
  const [domains, setDomains] = useState([
    {
      id: 1,
      domain: "medisamvad.com",
      status: "loading",
      data: null,
      lastChecked: null,
    },
    {
      id: 2,
      domain: "clirnet.com",
      status: "loading",
      data: null,
      lastChecked: null,
    },
    {
      id: 3,
      domain: "doctor.clirnet.com",
      status: "loading",
      data: null,
      lastChecked: null,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [globalLoading, setGlobalLoading] = useState(false);

  const fetchWhoisData = async (domain) => {
    try {
      const res = await fetch(
        `https://domain-dash-node.onrender.com/certificate-info?domain=${domain}`
      );
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return {
        registrar: data.issuer?.organization || "-",
        expiration_date: data.expiresOn
          ? new Date(data.expiresOn).getTime() / 1000
          : null,
        issued_date: data.issuedOn
          ? new Date(data.issuedOn).getTime() / 1000
          : null,
      };
    } catch {
      return null;
    }
  };

  const checkAllDomains = async () => {
    setGlobalLoading(true);
    const updated = await Promise.all(
      domains.map(async (d) => {
        const data = await fetchWhoisData(d.domain);
        return {
          ...d,
          data,
          status: data ? "success" : "error",
          lastChecked: new Date(),
        };
      })
    );
    setDomains(updated);
    setGlobalLoading(false);
  };

  const getDaysUntilExpiry = (unix) => {
    if (!unix) return null;
    const now = new Date();
    const diff = new Date(unix * 1000) - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStats = () => {
    const active = domains.filter((d) => d.status === "success").length;
    const errors = domains.filter((d) => d.status === "error").length;
    const expiringSoon = domains.filter((d) => {
      const days = getDaysUntilExpiry(d.data?.expiration_date);
      return days !== null && days < 30;
    }).length;
    return { total: domains.length, active, errors, expiringSoon };
  };

  const filteredDomains = domains.filter((d) =>
    d.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    checkAllDomains();
  }, []);

  const stats = getStats();

  return (
    <div
      style={{ background: "#f1f3f4", minHeight: "100vh", paddingTop: "30px" }}
    >
      <Container fluid="lg">
        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold text-primary mb-1">SSL Domain Monitor</h4>
            <div className="text-muted small">
              Track SSL certificate expiry with real-time checks
            </div>
          </div>
          <Button
            onClick={checkAllDomains}
            variant="primary"
            className="d-flex align-items-center"
            disabled={globalLoading}
          >
            {globalLoading ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : (
              <RefreshCw className="me-2" size={16} />
            )}
            Refresh All
          </Button>
        </div>

        {/* Stats */}
        <Row className="mb-3 g-3">
          <Col md={3}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h6 className="text-muted">Total Domains</h6>
                <h5 className="fw-bold">{stats.total}</h5>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h6 className="text-muted">Active</h6>
                <h5 className="fw-bold text-success">{stats.active}</h5>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h6 className="text-muted">Expiring Soon</h6>
                <h5 className="fw-bold text-warning">{stats.expiringSoon}</h5>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <h6 className="text-muted">Errors</h6>
                <h5 className="fw-bold text-danger">{stats.errors}</h5>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Alert */}
        {stats.expiringSoon > 0 && (
          <Alert variant="warning" className="d-flex align-items-center">
            <AlertTriangle className="me-2" />
            {stats.expiringSoon} domain(s) are expiring in less than 30 days!
          </Alert>
        )}

        {/* Search */}
        <InputGroup className="mb-4">
          <InputGroup.Text>
            <Search size={16} />
          </InputGroup.Text>
          <Form.Control
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light text-muted">
                <tr>
                  <th className="px-4 py-3">Domain</th>
                  <th>Status</th>
                  <th>Registrar</th>
                  <th>Issued On</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {filteredDomains.map((d) => {
                  const days = getDaysUntilExpiry(d.data?.expiration_date);
                  return (
                    <tr key={d.id}>
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center">
                          <Globe size={16} className="me-2 text-muted" />
                          {d.domain}
                        </div>
                      </td>
                      <td>
                        <Badge
                          bg={
                            d.status === "success"
                              ? "success"
                              : d.status === "error"
                              ? "danger"
                              : "secondary"
                          }
                        >
                          {d.status === "loading" ? "Loading..." : d.status}
                        </Badge>
                      </td>
                      <td>{d.data?.registrar || "-"}</td>
                      <td>
                        {d.data?.issued_date
                          ? new Date(
                              d.data.issued_date * 1000
                            ).toLocaleDateString()
                          : "-"}
                      </td>

                      <td>
                        {d.data?.expiration_date
                          ? new Date(
                              d.data.expiration_date * 1000
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>
                        {days !== null ? (
                          <Badge
                            bg={
                              days < 30
                                ? "danger"
                                : days < 90
                                ? "warning"
                                : "success"
                            }
                          >
                            {days} days
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default App;
